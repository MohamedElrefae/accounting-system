import glob
import re

def tryint(s):
    try:
        return int(s)
    except:
        return s

def alphanum_key(s):
    return [ tryint(c) for c in re.split('([0-9]+)', s) ]

files = glob.glob('load_*.sql')
files.sort(key=alphanum_key)

for f in files:
    print(f)
