import sys
import types
import unittest
from unittest.mock import patch

# Allow pure helper tests to run without installing Streamlit in the test runner.
# Production uses the real Streamlit package from requirements.txt.
stub = types.ModuleType("streamlit")
def cache_data(*args, **kwargs):
    def decorate(func):
        return func
    return decorate
stub.cache_data = cache_data
sys.modules.setdefault("streamlit", stub)

from celloras_data import plant_literature_query, _safe_limit, search_gene_records

class DataHelpersTest(unittest.TestCase):
    def test_limit_is_bounded(self):
        self.assertEqual(_safe_limit(0), 1)
        self.assertEqual(_safe_limit(1000), 50)

    def test_literature_query_includes_species_and_topic(self):
        query = plant_literature_query("Arabidopsis thaliana", "root atlas")
        self.assertIn('"Arabidopsis thaliana"', query)
        self.assertIn('"root atlas"', query)

    def test_gene_search_empty_inputs_do_not_call_api(self):
        with patch("celloras_data.requests.get") as get:
            self.assertEqual(search_gene_records("", "Arabidopsis thaliana"), [])
            self.assertEqual(search_gene_records("WOX5", ""), [])
            get.assert_not_called()

    def test_gene_search_returns_source_linked_annotation(self):
        class Response:
            def __init__(self, payload):
                self.payload = payload
            def raise_for_status(self):
                return None
            def json(self):
                return self.payload

        search_payload = {"esearchresult": {"idlist": ["12345"]}}
        summary_payload = {"result": {"uids": ["12345"], "12345": {
            "uid": "12345", "name": "WOX5", "description": "WUSCHEL-related homeobox 5",
            "organism": {"scientificname": "Arabidopsis thaliana", "taxid": 3702},
            "chromosome": "5", "otheraliases": "AtWOX5", "summary": "Source summary",
            "genomicinfo": [{"chraccver": "NC_003076.8", "chrstart": 100, "chrstop": 200}],
        }}}
        with patch("celloras_data.requests.get", side_effect=[Response(search_payload), Response(summary_payload)]):
            records = search_gene_records("WOX5", "Arabidopsis thaliana")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["symbol"], "WOX5")
        self.assertEqual(records[0]["gene_id"], "12345")
        self.assertEqual(records[0]["url"], "https://www.ncbi.nlm.nih.gov/gene/12345")
        self.assertIn("not an expression measurement", records[0]["record_type"])

if __name__ == "__main__":
    unittest.main()
