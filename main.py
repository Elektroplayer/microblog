from pathlib import Path
import json
import minify_html

page_template = Path("./src/page_template.html").read_text(encoding="utf-8")
index_template = Path("./src/index.html").read_text(encoding="utf-8")
style = Path("./src/style.css").read_text(encoding="utf-8")

page_template = page_template.replace("{{STYLE}}", style)
index_template = index_template.replace("{{STYLE}}", style)


class Page:
    def __init__(self, template, content, meta, url_path):
        self.template = template
        self.content = content
        self.name = meta["name"]
        self.path = url_path

    def construct(self):
        return self.template.replace("{{PAGE}}", self.content).replace(
            "{{NAME}}", self.name
        )

    def nav(self):
        return f'<a href="./{self.path}">{self.name}</a><br/>'


path = Path("./src/pages/")

dirs = [p.name for p in path.iterdir() if p.is_dir()]
pages = []

for dir_name in dirs:
    with open("./src/pages/" + dir_name + "/index.html") as t:
        with open("./src/pages/" + dir_name + "/meta.json") as j:
            meta = json.load(j)
            pages += [Page(page_template, t.read(), meta, dir_name)]

nav = ""

for p in pages:
    path = Path("./dist/" + p.path + "/index.html")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        minify_html.minify(p.construct(), minify_css=True, minify_js=True),
        encoding="utf-8",
    )

    nav += p.nav()

index_template = index_template.replace("{{PAGES_NAV}}", nav)

path = Path("./dist/index.html")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(
    minify_html.minify(index_template, minify_css=True, minify_js=True),
    encoding="utf-8",
)
