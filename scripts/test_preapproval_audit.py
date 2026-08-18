import json
import shutil
import tempfile
import unittest
from pathlib import Path

import preapproval_audit as audit


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "content" / "learn" / "claude-code"


class PreapprovalAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.sample_dir = root / "content" / "learn" / "claude-code"
        shutil.copytree(SOURCE_DIR / "editorial", self.sample_dir / "editorial")
        shutil.copytree(SOURCE_DIR / "reports", self.sample_dir / "reports")
        for name in ("manifest.json", "approval-lock.json"):
            shutil.copy2(SOURCE_DIR / name, self.sample_dir / name)
        candidate_path = self.sample_dir / "reports" / "gold-sample-candidate.json"
        candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
        manifest = json.loads((self.sample_dir / "manifest.json").read_text(encoding="utf-8"))
        first = next(item for item in manifest["chapters"] if item["slug"] == "01-foundations")
        candidate["chapter"].update({key: first[key] for key in ("contentHash", "status")})
        candidate_path.write_text(json.dumps(candidate), encoding="utf-8")
        # The sample references five local public assets; fixture files are enough
        # because this command checks presence, not image pixels.
        for name in [
            "01-project-desk.png", "03-prompt-anatomy.png", "02-agent-loop.png",
            "04-permission-stop.png", "05-two-checks.png",
        ]:
            path = root / "public" / "images" / "learn" / "claude-code" / "01-foundations" / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"fixture")
        self.sample = self.sample_dir / "editorial" / "gold-sample-01.md"

    def tearDown(self):
        self.temp.cleanup()

    def test_current_sample_passes_readiness_gate(self):
        result = audit.audit_gold_sample(self.sample)
        self.assertTrue(result["ok"])
        self.assertTrue(result["publicationBlocked"])
        self.assertEqual(result["images"], 5)

    def test_backstage_language_fails_closed(self):
        self.sample.write_text(self.sample.read_text(encoding="utf-8") + "\n失败树\n", encoding="utf-8")
        with self.assertRaisesRegex(audit.AuditError, "backstage"):
            audit.audit_gold_sample(self.sample)

    def test_approved_candidate_fails_closed(self):
        candidate_path = self.sample_dir / "reports" / "gold-sample-candidate.json"
        candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
        candidate["approval"]["approved"] = True
        candidate_path.write_text(json.dumps(candidate), encoding="utf-8")
        with self.assertRaisesRegex(audit.AuditError, "approval must remain false"):
            audit.audit_gold_sample(self.sample)

    def test_missing_asset_fails_closed(self):
        asset = self.sample.parents[3].parent / "public" / "images" / "learn" / "claude-code" / "01-foundations" / "01-project-desk.png"
        asset.unlink()
        with self.assertRaisesRegex(audit.AuditError, "missing local image"):
            audit.audit_gold_sample(self.sample)

    def test_publication_state_fails_closed(self):
        path = self.sample_dir / "manifest.json"
        manifest = json.loads(path.read_text(encoding="utf-8"))
        manifest["publicationState"] = "published"
        path.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(audit.AuditError, "manifest must remain draft"):
            audit.audit_gold_sample(self.sample)

    def test_candidate_revision_hash_status_must_match(self):
        path = self.sample_dir / "reports" / "gold-sample-candidate.json"
        candidate = json.loads(path.read_text(encoding="utf-8"))
        candidate["chapter"]["status"] = "verified"
        path.write_text(json.dumps(candidate), encoding="utf-8")
        with self.assertRaisesRegex(audit.AuditError, "manifest chapter status"):
            audit.audit_gold_sample(self.sample)


if __name__ == "__main__":
    unittest.main()
