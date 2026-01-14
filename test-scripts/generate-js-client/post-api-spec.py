import httpx
from pathlib import Path

print("Make sure you run the UI server with `yarn dev` first")

casename = "minimal-payload"
root = Path(__file__).absolute().parent
payload_path = root / (casename + ".json")
output_path = root / casename
output_path.mkdir()

url = "http://localhost:5173/api/new-openapi-spec"
payload = payload_path.read_text()
print(payload)

resp = httpx.post(
    url,
    content=payload,
    headers={"Content-Type": "application/json"},
)
resp.raise_for_status()

result = resp.json()
print(result)

for f in result["files"]:
    fn = f["fileName"] + f["fileExtension"]
    (output_path / fn).write_text(f["fileContent"])
