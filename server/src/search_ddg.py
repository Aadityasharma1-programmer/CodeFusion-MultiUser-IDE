import sys
import json
import warnings
import os

# Suppress all warnings
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"

try:
    # Handle the fact that duckduckgo_search has been renamed to ddgs
    try:
        from ddgs import DDGS
    except ImportError:
        from duckduckgo_search import DDGS

    def search_facts(query, num_results=5):
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=num_results))
            return {"results": results}
        except Exception as e:
            return {"error": str(e)}

    if __name__ == "__main__":
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No query provided"}))
            sys.exit(1)
            
        query = sys.argv[1]
        res = search_facts(query)
        print(json.dumps(res))
except Exception as main_e:
    print(json.dumps({"error": str(main_e)}))
