import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import learn_content as portal


class ConverterTests(unittest.TestCase):
    def setUp(self):
        self.entry = {"slug": "sample", "sourceWikiToken": "wiki-token"}
        self.editorial = {
            "summary": "summary",
            "directAnswer": "answer",
            "difficulty": "入门",
            "readingMinutes": 10,
            "tags": ["test"],
            "quality": {"overall": 90, "accuracy": 23, "depth": 18},
            "sources": [{"label": "Official", "url": "https://example.com"}, {"label": "Spec", "url": "https://example.org"}],
            "images": {"image-token": {"alt": "运行图", "caption": "图 1：执行流程", "sourceLabel": "自制解释图"}},
        }

    @patch.object(portal, "download_asset", return_value="/learn-assets/claude-code/hash.png")
    def test_supported_blocks_are_preserved(self, _download):
        xml = """<h1>Sample</h1><h2>Mechanism</h2><p>Body</p><pre language="python">print(1)</pre>
        <image token="image-token"/><callout title="Key"><p>Important</p></callout>
        <grid><column title="A"><p>Left</p></column><column title="B"><p>Right</p></column></grid>
        <table caption="Compare"><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>
        <blockquote citation="Source">Quote</blockquote><ol><li>One</li><li>Two</li></ol>"""
        chapter = portal.convert_document(self.entry, {"content": xml, "revision_id": 7}, self.editorial)
        block_types = [block["type"] for block in chapter["blocks"]]
        self.assertEqual(block_types, ["heading", "paragraph", "code", "image", "callout", "grid", "table", "quote", "list"])
        self.assertEqual(chapter["blocks"][0]["id"], "mechanism")
        self.assertEqual(chapter["blocks"][3]["alt"], "运行图")

    def test_unknown_top_level_block_fails_closed(self):
        with self.assertRaisesRegex(portal.GateError, "unknown or unsupported"):
            portal.convert_document(self.entry, {"content": "<h1>Sample</h1><mystery>lost</mystery>", "revision_id": 1}, self.editorial)

    def test_exactly_one_h1_is_required(self):
        with self.assertRaisesRegex(portal.GateError, "exactly one H1"):
            portal.convert_document(self.entry, {"content": "<h1>A</h1><h1>B</h1>", "revision_id": 1}, self.editorial)

    def test_active_editorial_rejection_blocks_mutating_pipeline(self):
        with TemporaryDirectory() as temporary:
            rejection = Path(temporary) / "editorial-rejection.json"
            rejection.write_text('{"state":"active"}', encoding="utf-8")
            with patch.object(portal, "EDITORIAL_REJECTION_PATH", rejection):
                with self.assertRaisesRegex(portal.GateError, "frozen"):
                    portal.require_editorial_batch_unfrozen("export website snapshots")


if __name__ == "__main__":
    unittest.main()
