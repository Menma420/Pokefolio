"""Extract a bounded interaction program, never ship source text in app code.

Commands are retained verbatim (including unsupported ones) for fail-closed
runtime diagnostics. Only reachable labels/texts are emitted to private output.
"""
import re

FURNITURE = {
    'MB_PICTURE_BOOK_SHELF': 'EventScript_PictureBookShelf',
    'MB_BOOKSHELF': 'EventScript_BookShelf',
    'MB_POKEMON_CENTER_BOOKSHELF': 'EventScript_PokemonCenterBookShelf',
    'MB_VASE': 'EventScript_Vase', 'MB_TRASH_CAN': 'EventScript_EmptyTrashCan',
    'MB_SHOP_SHELF': 'EventScript_ShopShelf', 'MB_BLUEPRINT': 'EventScript_Blueprint',
    'MB_RUNNING_SHOES_INSTRUCTION': 'EventScript_RunningShoesManual',
    'MB_TELEVISION': 'EventScript_TV', 'MB_REGION_MAP': 'EventScript_RegionMap',
    'MB_PC': 'EventScript_PC',
}


def extract_interactions(repo, maps, read):
    blocks = {}; sources = {}
    # Index definitions without adding unused files to provenance. Every emitted
    # block's entire source file is subsequently recorded through Extraction.read.
    paths = sorted((repo / 'data').rglob('*.inc')) + [repo / 'data/event_scripts.s']
    for path in paths:
        label = None
        for number, raw in enumerate(path.read_text().splitlines(), 1):
            line = raw.split('@', 1)[0].strip() if not '.string' in raw else raw.strip()
            match = re.fullmatch(r'(\w+)::?', line)
            if match:
                label = match[1]; blocks[label] = []
                sources[label] = {'path': str(path.relative_to(repo)), 'line': number}
            elif label and line:
                blocks[label].append(line)
    roots = set(FURNITURE.values())
    for m in maps.values():
        roots.update(o['script'] for o in m['events']['object_events'] if o['script'] != 'NULL')
        roots.update(o['script'] for o in m['events']['bg_events'] if o.get('script'))
    programs = {}; texts = {}; origins = {}; pending = sorted(roots, reverse=True)
    while pending:
        label = pending.pop()
        if label in programs or label in texts or label not in blocks:
            continue
        commands = blocks[label]; origins[label] = sources[label]
        read(sources[label]['path'])
        if commands and commands[0].startswith('.string'):
            texts[label] = ''.join(re.findall(r'^\.string "(.*)"', '\n'.join(commands), re.M))
            continue
        programs[label] = commands
        for command in commands:
            op, _, args = command.partition(' ')
            args = [arg.strip() for arg in args.split(',')]
            if op in ['goto', 'call'] or op.startswith(('goto_if_', 'call_if_')):
                pending.append(args[-1])
            elif op == 'applywaitmovement':
                pending.append(args[-1])
            elif op in ['msgbox', 'message', 'pokenavcall']:
                pending.append(args[0])
    strings = read('src/strings.c').decode()
    for name, value in re.findall(r'const u8 (\w+)\[\] = _\("([^"\n]*)"\);', strings):
        if name in ['gText_BigGuy', 'gText_BigGirl', 'gText_Son', 'gText_Daughter', 'gText_Mom', 'gText_Dad', 'gText_MomOrDadMightLikeThisProgram', 'gText_ExpandedPlaceholder_Kun', 'gText_ExpandedPlaceholder_Chan', 'gText_ExpandedPlaceholder_May', 'gText_ExpandedPlaceholder_Brendan']:
            texts[name] = value
    # Source handlers and constants are also explicit provenance dependencies.
    for path in ['src/field_specials.c', 'src/tv.c', 'data/scripts/std_msgbox.inc', 'asm/macros/event.inc']:
        read(path)
    constants = {}
    for path in ['include/constants/global.h', 'include/constants/tv.h', 'include/constants/metatile_labels.h']:
        constants.update({k: int(v, 0) for k, v in re.findall(r'^#define (\w+)\s+(0x[0-9A-Fa-f]+|\d+)\b', read(path).decode(), re.M)})
    movement = read('src/event_object_movement.c').decode()
    facing_table = re.search(r'gInitialMovementTypeFacingDirections\[\] = \{(.*?)\};', movement, re.S)[1]
    facings = {k: v.lower() for k, v in re.findall(r'\[(MOVEMENT_TYPE_\w+)\] = DIR_(\w+)', facing_table)}
    return {'initialFacings': facings, 'programs': programs, 'texts': texts, 'origins': origins, 'furniture': FURNITURE, 'constants': constants}
