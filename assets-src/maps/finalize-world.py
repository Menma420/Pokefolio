"""P9 map authoring. Reuses the approved B1 atlases without changing a single pixel.
Run from any directory, then pnpm compile:maps. test-town remains a frozen fixture.
"""
from pathlib import Path
import copy
import json

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets-src/maps'
IDS = json.loads((ROOT / 'public/assets/world/manifest.json').read_text())['tileIds']
base = json.loads((SOURCE / 'test-town.tmj').read_text())
world = copy.deepcopy(base)
W, H = 36, 22
world.update(width=W, height=H)
collision = [0] * (W * H)
ground = [IDS['grass-' + str((x * 7 + y * 3) % 4)] for y in range(H) for x in range(W)]
decor, above = [0] * (W * H), [0] * (W * H)
paths = set()

def rectangle(x, y, w, h):
    return {(xx, yy) for yy in range(y, y + h) for xx in range(x, x + w)}

def put(layer, x, y, name):
    layer[y * W + x] = IDS[name]

def block(points, flags=1):
    for x, y in points:
        collision[y * W + x] = flags

def path(x, y, w, h):
    paths.update(rectangle(x, y, w, h))

# Preserve the approved northern town composition and established movement paths.
for layer in base['layers']:
    if layer['name'] in ['ground', 'decor', 'above']:
        destination = {'ground': ground, 'decor': decor, 'above': above}[layer['name']]
        for y in range(9):
            for x in range(30):
                destination[y * W + x] = layer['data'][y * 30 + x]
# The old southern fence and edge now open onto the village green.
for x in range(30):
    decor[8 * W + x] = 0
for y in range(6, 10):
    for x in range(4):
        above[y * W + x] = decor[y * W + x] = 0
for y in range(1, 9):
    put(ground, 29, y, 'grass-' + str((29 * 7 + y * 3) % 4))

block({(x, y) for y in range(H) for x in range(W) if x in [0, W - 1] or y in [0, H - 1]})
pond = rectangle(3, 2, 3, 2) | rectangle(14, 11, 4, 3) | rectangle(17, 13, 2, 4)
block(pond, 2)
path(1, 5, 34, 2)
path(7, 1, 1, 20)
path(11, 6, 1, 10)  # Paved bypass around the workshop; never through its facade.
path(21, 4, 1, 17)
path(7, 15, 23, 2)
path(11, 17, 11, 1)  # Wrap around the stream's southern bank.
path(30, 5, 2, 16)
path(21, 19, 11, 2)
path(26, 16, 1, 4)
path(8, 14, 1, 3)
path(7, 18, 5, 1)
path(11, 17, 1, 2)

def house(x, y):
    # Approved B1 five-tile roof, facade, window, recessed door and porch assembly.
    block(rectangle(x, y, 5, 4))
    block({(x + 2, y + 3), (x + 2, y + 4)})
    for yy in range(2):
        for xx in range(5):
            edge = 'left' if xx == 0 else 'right' if xx == 4 else 'middle'
            put(above, x + xx, y + yy, f'roof-{edge}-{yy}')
    for yy in [2, 3]:
        for xx in range(5):
            key = 'wall-left' if xx == 0 else 'wall-right' if xx == 4 else 'window' if xx in [1, 3] else 'door-upper' if yy == 3 else 'wall'
            put(decor, x + xx, y + yy, key)
    for xx in [0, 1, 3, 4]:
        put(decor, x + xx, y + 4, 'porch')
    put(decor, x + 2, y + 4, 'door-lower')

house(20, 1)  # Original home, entrance still (22,5), with a small flower garden.
house(6, 10)
house(24, 12)

def tree(x, y):
    for ty in range(3):
        for tx in range(2):
            put(above if ty < 2 else decor, x + tx, y + ty, f'tree-{tx}-{ty}')
    block(rectangle(x, y + 2, 2, 1))

# Natural boundaries and a secondary woodland route; no mandatory maze.
for x, y in [(0, 0), (12, 0), (16, 0), (28, 0), (33, 0), (0, 10), (0, 17),
             (12, 8), (18, 10), (2, 11), (2, 18), (12, 18),
             (27, 7), (32, 8), (33, 11), (29, 12), (32, 15), (29, 17), (33, 18)]:
    tree(x, y)
for ty in range(4):
    for tx in range(4):
        put(above if ty < 3 else decor, 3 + tx, 15 + ty, f'grand-{tx}-{ty}')
block({(4, 18), (5, 18)})
grass = rectangle(8, 1, 4, 2) | rectangle(24, 8, 3, 3)
block(grass, 4)
for x, y in grass:
    put(decor, x, y, 'tall-grass')

for y in range(H):
    for x in range(W):
        flags = collision[y * W + x]
        if (x, y) in pond:
            mask = sum(bit for dx, dy, bit in [(0, -1, 1), (1, 0, 2), (0, 1, 4), (-1, 0, 8)] if (x + dx, y + dy) in pond)
            put(ground, x, y, 'water-' + str(mask))
            decor[y * W + x] = above[y * W + x] = 0
        elif x in [0, W - 1] or y in [0, H - 1]:
            put(ground, x, y, 'boundary')
        elif (x, y) in paths and not flags & 3:
            mask = sum(bit for dx, dy, bit in [(0, -1, 1), (1, 0, 2), (0, 1, 4), (-1, 0, 8)] if (x + dx, y + dy) in paths and not collision[(y + dy) * W + x + dx] & 3)
            put(ground, x, y, 'path-' + str(mask))
        elif not flags & 3 and not decor[y * W + x] and not above[y * W + x]:
            if (x * 3 + y * 7) % 13 == 0:
                put(decor, x, y, 'flowers')
            elif (x + y * 3) % 11 == 0:
                put(decor, x, y, 'tuft')
            elif (x * 5 + y) % 19 == 0:
                put(decor, x, y, 'pebbles')
for x, y in [(25, 4), (26, 4), (25, 5), (26, 5), (6, 17), (8, 11)]:
    if not collision[y * W + x] & 3:
        put(decor, x, y, 'flowers')
for x in [2, 3, 4, 5, 11, 12]:
    put(decor, x, 20, 'fence')
    block({(x, 20)})
block({(1, 20), (28, 8), (29, 8)})

def obj(id, kind, x, y, **properties):
    return {'id': 0, 'name': id, 'class': kind, 'x': x * 16, 'y': y * 16,
            'properties': [{'name': key, 'value': json.dumps(value) if isinstance(value, (dict, list)) else value} for key, value in properties.items()]}

objects = [
    obj('town-spawn', 'spawn', 7, 5, facing='right'),
    obj('route-guide', 'npc', 9, 5, facing='left', route={'mode': 'pingpong', 'points': [{'x': 9, 'y': 5, 'waitTicks': 20}, {'x': 10, 'y': 5, 'waitTicks': 20}, {'x': 10, 'y': 6, 'waitTicks': 20}]}),
    obj('route-neighbor', 'npc', 23, 18, facing='down', route={'mode': 'pingpong', 'points': [{'x': 23, 'y': 18, 'waitTicks': 24}, {'x': 24, 'y': 18, 'waitTicks': 24}, {'x': 24, 'y': 19, 'waitTicks': 24}]}),
    obj('challenger', 'npc', 18, 7, facing='left', route={'mode': 'pingpong', 'points': [{'x': 18, 'y': 7, 'waitTicks': 0}]}),
]
doors = [('home-front', 22, 5, 'm1-interior-test', 21, 5), ('workshop-front', 8, 14, 'm1-workshop', 8, 15), ('cottage-front', 26, 16, 'm1-cottage', 26, 17)]
for id, x, y, interior, rx, ry in doors:
    objects.append(obj(id, 'door', x, y, targetMapId=interior, targetDoorId='interior-exit', arrivalX=7, arrivalY=7, arrivalFacing='up'))
signs = [('town-sign', 8, 3), ('route-sign', 20, 6), ('forest-sign', 29, 19)]
secrets = [('grand-tree-note', 6, 18), ('forest-cache', 33, 7)]
for id, x, y in signs + secrets:
    objects.append(obj(id, 'sign' if (id, x, y) in signs else 'object', x, y))
    put(decor, x, y, 'sign' if (id, x, y) in signs else 'pebbles')
    block({(x, y)})

landmarks = [
    ('town-center', 'town', 7, 5, 4, 3), ('home', 'home', 20, 1, 5, 5),
    ('workshop', 'building', 6, 10, 5, 5), ('route-cottage', 'building', 24, 12, 5, 5),
    ('town-pond', 'water', 3, 2, 3, 2), ('village-stream', 'water', 14, 11, 5, 6),
    ('grass-patch', 'grass', 24, 8, 3, 3), ('side-forest', 'forest', 29, 7, 6, 14),
    ('grand-tree', 'grand-tree', 3, 15, 4, 4),
] + [(id, 'sign', x, y, 1, 1) for id, x, y in signs] + [(id, 'secret', x, y, 1, 1) for id, x, y in secrets]
world['properties'] = [
    {'name': 'cameraMode', 'value': 'follow'}, {'name': 'p9AuthoredMap', 'value': True},
    {'name': 'landmarks', 'value': json.dumps([dict(zip(['id', 'kind', 'x', 'y', 'width', 'height'], item)) for item in landmarks])},
]
world['layers'] = [{'type': 'tilelayer', 'name': name, 'width': W, 'height': H, 'data': values, 'opacity': 1, 'visible': True, 'x': 0, 'y': 0}
                   for name, values in [('ground', ground), ('decor', decor), ('above', above), ('collision', collision)]]
for id, x, width in [('west-room', 0, 15), ('east-room', 15, W - 15)]:
    room = obj(id, 'room', x, 0)
    room.update(width=width * 16, height=H * 16)
    objects.append(room)
for index, item in enumerate(objects, 1):
    item['id'] = index
world['layers'].append({'type': 'objectgroup', 'name': 'objects', 'objects': objects})
(SOURCE / 'm1-town.tmj').write_text(json.dumps(world, indent=2) + '\n')

# Three fixed-screen interiors. Same approved floor/wall artwork; flavor only.
template = json.loads((SOURCE / 'interior-test.tmj').read_text())
for number, (id, x, y, name, rx, ry) in enumerate(doors):
    interior = copy.deepcopy(template)
    interior['properties'] = [{'name': 'p9AuthoredMap', 'value': True}]
    layers = {layer['name']: layer for layer in interior['layers'] if layer['type'] == 'tilelayer'}
    if number:
        for xx in range(3, 12):
            layers['decor']['data'][3 * 15 + xx] = IDS['interior-wall']
            layers['collision']['data'][3 * 15 + xx] = 1
    objects = [obj('interior-spawn', 'spawn', 7, 7, facing='up'),
               obj('interior-exit', 'door', 7, 8, targetMapId='m1-town', targetDoorId=id, arrivalX=rx, arrivalY=ry, arrivalFacing='left' if number == 0 else 'up', exitTile=True, exitTileX=7, exitTileY=7)]
    flavor_id = ['home-shelf', 'workshop-note', 'cottage-note'][number]
    objects.append(obj(flavor_id, 'object', 10, 5))
    layers['decor']['data'][5 * 15 + 10] = IDS['sign']
    layers['collision']['data'][5 * 15 + 10] = 1
    layers['decor']['data'][4 * 15 + 3] = IDS['flowers']
    room = obj('interior-room', 'room', 0, 0)
    room.update(width=240, height=160)
    objects.append(room)
    for index, item in enumerate(objects, 1):
        item['id'] = index
    interior['layers'] = [layer for layer in interior['layers'] if layer['type'] == 'tilelayer'] + [{'type': 'objectgroup', 'name': 'objects', 'objects': objects}]
    (SOURCE / f'{name}.tmj').write_text(json.dumps(interior, indent=2) + '\n')
print('Authored contiguous 36x22 town + route and three 15x10 interiors using unchanged B1 art.')
