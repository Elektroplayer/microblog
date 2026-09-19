import frontmatter
from markdown import markdown
from pathlib import Path
import minify_html
from datetime import date, datetime, timezone
from html import escape
from feedgen.feed import FeedGenerator
import shutil
import re

TEMPLATE_RE = re.compile(r"\{\{([a-zA-Z0-9_.-]+)\}\}")

components = {}

for file in Path("./src/components/").iterdir():
    if not file.is_file():
        continue

    components[file.name] = file.read_text(encoding="utf-8")

    match file.suffix:
        case ".css":
            components[file.name] = f"<style>{components[file.name]}</style>"
        case ".js":
            components[file.name] = f"<script>{components[file.name]}</script>"


# def render(template: str, vars: dict[str, str]) -> str:
#     for key, value in vars.items():
#         template = template.replace(f"{{{{{key}}}}}", value)
#
#     return template


def parse_date(value) -> date | None:
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, float):
        try:
            return datetime.fromtimestamp(value).date()
        except (ValueError, OSError, OverflowError):
            return None

    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    return None


def resolve_date(*sources) -> date | None:
    for source in sources:
        parsed = parse_date(source)
        if parsed is not None:
            return parsed

    return None


def touch_with_content(url, content):
    path = Path(url)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class Page:
    def __init__(self) -> None:
        pass

    def render(self, comp={}) -> str:
        comp |= components

        def replace(match):
            name = match.group(1)

            if name not in comp:
                print(f"[WARN] Компонент {name} не найден")
                return "{{" + name + "}}"

            return comp[name]

        return TEMPLATE_RE.sub(replace, self.raw_html)

    def load_HTML_from_path(self, path: str):
        self.raw_html = Path(path).read_text(encoding="utf-8")

    def load_HTML(self, html: str):
        self.raw_html = html


page_template = Page()
page_template.load_HTML_from_path("./src/page_template.html")


class ArticlePage:
    def __init__(self) -> None:
        self.is_valid = True

    def load_markdown_page_from_path(self, path):
        self.id = Path(path).stem

        self.post = frontmatter.load(path)
        self.html = markdown(
            str(self.post),
            extensions=["fenced_code", "tables", "toc"],
        )

        self.created = parse_date(self.post.get("created"))
        self.updated = parse_date(self.post.get("updated"))

        self.title = self.post.get("title")
        self.description = self.post.get("description") or ""
        self.author = self.post.get("author") or "Электро"
        self.hidden = self.post.get("hidden") or False

        if self.created is None or self.title is None:
            print(f"[ERROR] {self.id} - не указаны обязательные метаданные")
            self.is_valid = False

    def get_components(self):
        meta = f"{self.author} · {str(self.created)}"

        if self.updated is not None and self.created != self.updated:
            meta += f"  · updated {str(self.updated)}"

        return {
            "CONTENT": self.html,
            "TITLE": escape(str(self.title)),
            "META": escape(meta),
            "DESC": escape(str(self.description)),
        }

    def get_page(self):
        if not self.is_valid:
            return None

        return minify_html.minify(
            page_template.render(self.get_components()), minify_css=True, minify_js=True
        )

    def add_to_rss(self, feed):
        if not self.is_valid:
            return

        entry = feed.add_entry()

        entry.id("https://electr0.net/p/" + self.id)
        entry.title(self.title)
        entry.content(src="https://electr0.net/p/" + self.id, type="text/html")
        entry.author(
            {
                "name": self.author,
            }
        )
        entry.link(href="https://electr0.net/p/" + self.id)
        entry.description(self.description)

        if self.created is not None:
            entry.published(
                datetime.combine(self.created, datetime.min.time(), tzinfo=timezone.utc)
            )

        if self.updated is not None:
            entry.updated(
                datetime.combine(self.updated, datetime.min.time(), tzinfo=timezone.utc)
            )


def PageFactory(mdUrl: str):
    p = ArticlePage()
    p.load_markdown_page_from_path(mdUrl)
    return p


def create_feed():
    fg = FeedGenerator()
    fg.id("https://electr0.net")
    fg.title("electr0.net микробложик")
    fg.author({"name": "Electro", "email": "me@electr0.net"})
    fg.link(href="https://electr0.net", rel="alternate")
    fg.subtitle("О... а о чём?")
    fg.link(href="https://electr0.net/rss.rss", rel="self")
    fg.language("ru")

    return fg


def build_root(pages_nav) -> None:
    source = Path("./src/root/")
    destination = Path("./dist/")

    for path in source.rglob("*"):
        if not path.is_file():
            continue

        relative = path.relative_to(source)
        output = destination / relative

        if path.suffix == ".html":
            p = Page()
            p.load_HTML(path.read_text(encoding="utf-8"))

            content = minify_html.minify(
                p.render({"PAGES_NAV": pages_nav}),
                minify_css=True,
                minify_js=True,
            )
        else:
            content = path.read_bytes()

        output.parent.mkdir(parents=True, exist_ok=True)

        if isinstance(content, bytes):
            output.write_bytes(content)
        else:
            output.write_text(content, encoding="utf-8")


def build():
    shutil.rmtree("./dist", ignore_errors=True)
    Path("./dist").mkdir()

    fg = create_feed()

    pages_path = Path("./src/pages/")
    nav = ""

    pages = sorted(
        [
            PageFactory(f"./src/pages/{p.name}")
            for p in pages_path.iterdir()
            if p.is_file()
        ],
        key=lambda b: (b.created is None, b.created),
        reverse=True,
    )

    for page in pages:
        if not page.is_valid:
            continue

        touch_with_content(f"./dist/p/{page.id}/index.html", page.get_page())

        if not page.hidden:
            nav += (
                f'<a href="./p/{page.id}/">[{str(page.created)}] {page.title}</a><br/>'
            )
            page.add_to_rss(fg)

    build_root(nav)

    # создаём RSS
    fg.rss_file("dist/rss.rss")


if __name__ == "__main__":
    build()

    # создание index.html
    # index = render(
    #     index_template,
    #     {
    #         "STYLE": style,
    #         "SCRIPT": script,
    #         "PAGES_NAV": nav,
    #     },
    # )
    #
    # touch_with_content(
    #     "./dist/index.html", minify_html.minify(index, minify_css=True, minify_js=True)
    # )

    # # Создание ошибки 404
    # e404 = render(
    #     e404_template,
    #     {
    #         "STYLE": style,
    #         "SCRIPT": script,
    #     },
    # )
    #
    # touch_with_content(
    #     "./dist/404.html", minify_html.minify(e404, minify_css=True, minify_js=True)
    # )

    # meta = f"{self.author} · {str(self.created)}"
    #
    # if self.updated is not None and self.created != self.updated:
    #     meta += f"  · updated {str(self.updated)}"
    #
    # page = render(
    #     self.template,
    #     {
    #         "CONTENT": self.html,
    #         "TITLE": escape(str(self.title)),
    #         "META": escape(meta),
    #         "DESC": escape(str(self.description)),
    #         "STYLE": self.style,
    #         "SCRIPT": self.script,
    #     },
    # )
    #
    # return minify_html.minify(page, minify_css=True, minify_js=True)
