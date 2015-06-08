import json


def load_data(path):
    with open(path) as fh:
        parties = []
        current = {}
        for line in fh.readlines():
            if line.startswith('# '):
                key, val = line.replace('# ', '').split(':')
                if key.strip().endswith('s') and val.find(',') != -1:
                    val_list = []
                    for v in val.split(','):
                        val_list.append(v.strip())
                    val = val_list
                elif key.strip().endswith('s'):
                    val = [val.strip()]
                else:
                    val = val.strip()
                current[key.strip()] = val
            elif current.get('party-slug', False):
                parties.append(current)
                current = {}
        if current.get('party-slug', False):
            parties.append(current)
        return parties


if __name__ == '__main__':
    print json.dumps(load_data('data.txt'))
