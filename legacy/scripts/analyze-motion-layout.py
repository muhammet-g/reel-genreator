"""Evaluate saved local browser observations; exits nonzero on invariant failures."""
from pathlib import Path
import argparse
import json
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from reelkit.core import load, save
from reelkit.motion_layout import analyze

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("composition", type=Path)
parser.add_argument("measurements", type=Path)
parser.add_argument("report", type=Path)
args = parser.parse_args()
report = analyze(load(args.composition / "composition-model.json"), load(args.measurements))
save(args.report, report)
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if report["error_count"] else 0)
