"""The code-editor explanation keeps Arabic and math in separate bidi runs."""
import unittest

from reelkit.motion_program import program_html


class TeachingEditorBidi(unittest.TestCase):
    def test_last_index_comment_is_arabic_followed_by_one_complete_ltr_math_run(self):
        scene = {
            "choreography": {"family": "count"},
            "code_array": {
                "variable": "fruits", "cells": ["تفاح", "موز", "برتقال"],
                "object_id": "fruits-example", "expression": "fruits[fruits.length - 1]",
                "editor_comments": [
                    {"arabic": "عدد العناصر =", "ltr": "3", "at": .4},
                    {"arabic": "الفهارس تبدأ من", "ltr": "0", "at": 2.56},
                    {"arabic": "آخر فهرس =", "ltr": "3 - 1 = 2", "at": 3.32},
                ],
            },
        }
        markup = program_html(scene)
        self.assertEqual(markup.count('class="editor-comment"'), 3)
        self.assertIn(
            '<span class="comment-arabic" dir="rtl">آخر فهرس =</span> '
            '<bdi class="comment-ltr" dir="ltr">3 - 1 = 2</bdi>', markup,
        )
        self.assertNotIn('<span class="comment-arabic" dir="rtl">آخر فهرس = 3 - 1 = 2', markup)
        self.assertIn('class="program-expression"', markup)


if __name__ == "__main__":
    unittest.main()
