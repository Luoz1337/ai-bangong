"""Inspect actual release DEX: renamed bridge class, original entry names and runtime annotations."""
import sys, struct, zipfile, re
from pathlib import Path
apk, mapping, activity = map(Path, sys.argv[1:])
b = zipfile.ZipFile(apk).read('classes.dex')
u32 = lambda o: struct.unpack_from('<I', b, o)[0]
def leb(o):
    value = shift = 0
    while True:
        n = b[o]; o += 1; value |= (n & 127) << shift
        if n < 128: return value, o
        shift += 7
strings = []
for i in range(u32(56)):
    _, o = leb(u32(u32(60) + 4*i)); end = b.index(0, o)
    strings.append(b[o:end].decode('utf8', 'replace'))
types = [strings[u32(u32(68) + 4*i)] for i in range(u32(64))]
methods = []
for i in range(u32(88)):
    owner, _, name = struct.unpack_from('<HHI', b, u32(92) + 8*i)
    methods.append((types[owner], strings[name]))
maps = mapping.read_text(encoding='utf8')
renamed = re.search(r'^cn\.gongzuodazi\.app\.MainActivity\$Bridge -> ([^:]+):', maps, re.M)[1]
assert renamed != 'cn.gongzuodazi.app.MainActivity$Bridge', 'R8 did not rename bridge'
assert re.search(r'KeyVault\.read\([^\n]+ -> [a-zA-Z]\w*', maps), 'Vault methods not obfuscated'
owner = 'L' + renamed.replace('.', '/') + ';'
required = set(re.findall(r'@JavascriptInterface public \w+ (\w+)\(', activity.read_text(encoding='utf8')))
annotated = set()
for i in range(u32(96)):
    offset = u32(100) + 32*i
    if types[u32(offset)] != owner: continue
    directory = u32(offset + 20)
    assert directory, 'Bridge annotation directory stripped'
    fields, count = u32(directory+4), u32(directory+8)
    for j in range(count):
        entry = directory + 16 + fields*8 + j*8
        method, annotations = u32(entry), u32(entry+4)
        for k in range(u32(annotations)):
            item = u32(annotations+4+4*k)
            annotation_type, _ = leb(item+1)
            if b[item] == 1 and types[annotation_type] == 'Landroid/webkit/JavascriptInterface;':
                assert methods[method][0] == owner
                annotated.add(methods[method][1])
assert annotated == required, (annotated, required)
assert owner in types and 'Lcn/gongzuodazi/app/MainActivity;' in types
print(f'PASS: real DEX obfuscates bridge/vault; all {len(required)} named JavascriptInterface methods retain runtime annotations; Activity entry retained.')
