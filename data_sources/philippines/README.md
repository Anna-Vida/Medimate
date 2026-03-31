Place Philippines source exports here, then run:

```bash
pip install pandas openpyxl
python scripts/philippines_sources_to_offline_json.py
```

Supported file types:
- `.csv`
- `.xlsx`
- `.xls`
- `.json`
- `.jsonl`

Recommended source exports:
- FDA registered drug products
- DOH drug price reference index
- PITAHC herbal medicine lists

Generated output:
- `assets/data/offline-medicines.ph.generated.json`
