import frontmatter
from markdown import markdown
from pathlib import Path
import minify_html
from datetime import date, datetime


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
    def __init__(self, url, template):
        file_path = Path(url)

        self.url_path = file_path.name[:-3]
        self.file_meta = file_path.stat()
        self.post = frontmatter.load(url)

        self.created = resolve_date(self.post.get("created"), self.file_meta.st_ctime)
        self.updated = resolve_date(self.post.get("updeted"), self.file_meta.st_mtime)

        if self.post.get("author") is None:
            self.post["author"] = "Электро"

        self.meta = f"{self.post['author']} · {str(self.created)}"
        self.description = self.post.get("description") or ""

        if self.created != self.updated:
            self.meta += f"  · updated {str(self.updated)}"

        self.html = markdown(
            str(self.post),
            extensions=["fenced_code", "tables", "toc"],
        )

        self.page = (
            template.replace("{{PAGE}}", str(self.html))
            .replace("{{NAME}}", self.post["title"])
            .replace("{{META}}", self.meta)
            .replace("{{DESC}}", self.description)
        )

        self.min_page = minify_html.minify(self.page, minify_css=True, minify_js=True)
        self.nav = f'<a href="./{self.url_path}">[{str(self.created)}] {self.post["title"]}</a><br/>'


page_template = Path("./src/page_template.html").read_text(encoding="utf-8")
index_template = Path("./src/index.html").read_text(encoding="utf-8")
style = Path("./src/style.css").read_text(encoding="utf-8")

page_template = page_template.replace("{{STYLE}}", style)
index_template = index_template.replace("{{STYLE}}", style)

pages_path = Path("./src/pages/")
nav = ""

pages = sorted(
    [
        Page(f"./src/pages/{p.name}", page_template)
        for p in pages_path.iterdir()
        if p.is_file()
    ],
    key=lambda b: (b.created is None, b.created),
)

for page in pages:
    touch_with_content(f"./dist/{page.url_path}/index.html", page.min_page)
    nav += page.nav

# создание index.html
index = index_template.replace("{{PAGES_NAV}}", nav)
touch_with_content(
    "./dist/index.html", minify_html.minify(index, minify_css=True, minify_js=True)
)
