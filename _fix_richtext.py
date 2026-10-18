    p='src/utils/richText.ts'
L=open(p).read().split(chr(10))
L[54]="      const breaks = '\\\\\\n'.repeat(match.length - 1);"
open(p,'w').write(chr(10).join(L))
print('done')
print(repr(L[54]))