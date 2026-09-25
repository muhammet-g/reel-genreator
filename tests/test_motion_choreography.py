"""Semantic operations, repetition diagnostics and shared object contracts."""
from copy import deepcopy
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from reelkit.core import load, save
from reelkit.motion_audio import intake_audio
from reelkit.motion_storyboard import import_storyboard, approve_storyboard
from reelkit.motion_design import validate_motion_plan, import_motion_plan
from reelkit.motion_choreography import motion_advisories, shared_arrays
from reelkit.motion_composition import build_motion_composition
from test_motion_m2 import fixtures


def programming(plan):
    for i,s in enumerate(plan['scenes']):
        s['choreography']={'family':'construct' if i==0 else 'tokens','beats':{'expression':.1}}
        s['motion']={'entrance':'auto','emphasis':'none','exit':'hold'}
        s['code_array']={'object_id':'example','variable':'items','cells':['أ','ب','ج'],
                         'expression':'items.at(-1)','tokens':['items','.at','(-1)'],'selected_index':2}
    return plan


class SemanticChoreography(unittest.TestCase):
    def test_detects_repetition_and_slide_dominance_without_modifying_plan(self):
        scenes=[{'id':str(i),'type':'statement','motion':{'entrance':'slide','emphasis':'none','exit':'slide'}} for i in range(4)]
        plan={'scenes':scenes,'transition_family':'push'};original=deepcopy(plan)
        report=motion_advisories(plan)
        self.assertEqual({x['code'] for x in report['findings']},{'repeated_entrance_family','repeated_directional_translation','repeated_choreography','slide_transition_reliance'})
        self.assertEqual(plan,original)

    def test_no_advisory_for_two_scenes_and_reports_whole_long_run(self):
        scenes=[{'id':str(i),'type':'statement','motion':{'entrance':'rise','emphasis':'none','exit':'hold'}} for i in range(5)]
        self.assertEqual(motion_advisories({'scenes':scenes[:2]})['advisory_count'],0)
        self.assertEqual(len(motion_advisories({'scenes':scenes})['findings'][0]['scenes']),5)

    def test_code_tokens_and_beats_reject_wrong_expression_and_out_of_range_time(self):
        with tempfile.TemporaryDirectory() as d:
            *_,board,plan=fixtures(Path(d));programming(plan)
            validate_motion_plan(plan,board,4)
            plan['scenes'][1]['code_array']['tokens']=['items','.at','(1)']
            with self.assertRaisesRegex(ValueError,'exact expression'):validate_motion_plan(plan,board,4)
            plan['scenes'][1]['code_array']['tokens']=['items','.at','(-1)']
            plan['scenes'][1]['choreography']['beats']['expression']=1.9
            with self.assertRaisesRegex(ValueError,'settle'):validate_motion_plan(plan,board,4)

    def test_shared_identity_rejects_changed_cells_and_gaps(self):
        with tempfile.TemporaryDirectory() as d:
            *_,board,plan=fixtures(Path(d));programming(plan)
            self.assertEqual(len(shared_arrays(plan['scenes'])),1)
            plan['scenes'][1]['code_array']['cells'][0]='different'
            with self.assertRaisesRegex(ValueError,'identity'):shared_arrays(plan['scenes'])
            plan['scenes'][1]['code_array']['cells'][0]='أ'
            plan['scenes'][1]['start']=2.1
            with self.assertRaisesRegex(ValueError,'contiguous'):shared_arrays(plan['scenes'])

    def test_extraction_requires_matching_single_source_value(self):
        with tempfile.TemporaryDirectory() as d:
            *_,board,plan=fixtures(Path(d));programming(plan)
            s=plan['scenes'][1];s['choreography']['family']='extract'
            s['code_array']['result']={'kind':'array','value':['ج'],'label':'مصفوفة'}
            validate_motion_plan(plan,board,4)
            s['code_array']['result']['value']=['أ']
            with self.assertRaisesRegex(ValueError,'matching source'):validate_motion_plan(plan,board,4)

    def test_composition_mounts_one_array_and_local_path_plugin(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);audio,script,board_file,plan_file,board,plan=fixtures(root)
            programming(plan);save(plan_file,plan)
            with patch('reelkit.motion_audio.project',return_value=root/'project'):
                p=intake_audio(audio,'fixture',script_path=script)
            import_storyboard(p,board_file);approve_storyboard(p,'Fixture creator');import_motion_plan(p,plan_file)
            out=build_motion_composition(p);page=(out/'index.html').read_text(encoding='utf-8')
            self.assertEqual(page.count('id="array-example"'),1)
            self.assertIn('data-duration="4"',page)
            self.assertTrue((out/'assets/MotionPathPlugin.min.js').exists())
            self.assertEqual(load(out/'motion-design-check.json')['advisory_count'],0)

if __name__=='__main__':unittest.main()
