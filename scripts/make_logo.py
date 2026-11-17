# Builds the BuyAI wordmark as pure SVG paths (no font needed). Run: python3 mklogo.py <outdir>
import math, sys
out=sys.argv[1]
def rot(pts, cx, cy, deg):
    a=math.radians(deg); c,s=math.cos(a),math.sin(a)
    return [(cx+(x-cx)*c-(y-cy)*s, cy+(x-cx)*s+(y-cy)*c) for x,y in pts]
P=lambda pts:"M"+" L".join(f"{x:.1f} {y:.1f}" for x,y in pts)+" Z"
B=("M0 0 H38 C57 0 65 10 65 25 C65 35 60 42 52 46 C63 50 69 59 69 72 C69 90 58 100 40 100 H0 Z "
   "M22 18 V36 H35 C41 36 44 32 44 27 C44 22 41 18 35 18 Z M22 54 V82 H38 C45 82 48 77 48 68 C48 59 45 54 38 54 Z")
u="M77 30 H99 V70 C99 78 102 82 108 82 C114 82 118 78 118 71 V30 H140 V100 H119 V92 C115 98 108 101 100 101 C85 101 77 92 77 76 Z"
# y: right arm runs into the descender; the left arm is a price tag (point up, with a hole)
yr="M193 30 H216 L183 120 Q177 136 160 136 H150 V116 H158 Q163 116 165 111 Z"
tag=[(0,-19),(13,-5),(13,52),(-13,52),(-13,-5)]          # tag silhouette around (0,0)
tag=[(x+163,y+42) for x,y in tag]
tag=rot(tag,175,96,-21)
hx,hy=rot([(163,38)],175,96,-21)[0]
A="M219 100 L245 0 H269 L295 100 H272 L267 81 H247 L242 100 Z M250 63 H264 L257 35 Z"
I="M303 0 H325 V100 H303 Z"
def svg(buy, ai, bg=None, hole=None):
    h = hole or (bg or "#fff")
    r = f'<rect x="-14" y="-24" width="352" height="174" rx="20" fill="{bg}"/>' if bg else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -24 352 174" role="img" aria-label="BuyAI">
<!-- BuyAI wordmark: heavy letters; the left arm of the "y" is a price tag. Drawn as paths, no font needed. -->
{r}<g fill="{buy}" fill-rule="evenodd"><path d="{B}"/><path d="{u}"/><path d="{yr}"/><path d="{P(tag)}"/></g>
<path d="M{hx:.1f} {hy:.1f} C{hx-4:.1f} {hy-14:.1f} {hx-14:.1f} {hy-22:.1f} {hx-24:.1f} {hy-20:.1f}" fill="none" stroke="{ai}" stroke-width="4" stroke-linecap="round"/>
<circle cx="{hx:.1f}" cy="{hy:.1f}" r="5.2" fill="{h}"/><circle cx="{hx:.1f}" cy="{hy:.1f}" r="2.4" fill="{ai}"/>
<g fill="{ai}" fill-rule="evenodd"><path d="{A}"/><path d="{I}"/></g></svg>'''
open(f"{out}/buyai-logo.svg","w").write(svg("#111317","#ff5a1f",None,"#f1f2f4"))   # header: black + orange on light
open(f"{out}/buyai-logo-dark.svg","w").write(svg("#f4f4f5","#ff5a1f","#111317"))
open(f"{out}/buyai-logo-light.svg","w").write(svg("#111317","#ff5a1f","#ffffff"))
# square app icon: just the tag-"y" on a night-navy tile
import re
full=svg("#ffffff","#ff5a1f",None,"#111317")
inner=re.search(r'<g fill="#ffffff".*?</g>\n.*?\n<circle.*?/><circle.*?/>', full, re.S).group(0)
inner=re.sub(r'<path d="M0 0 H38.*?/>|<path d="M77 30.*?/>','',inner)
icon=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="BuyAI">
<!-- BuyAI app icon: the price-tag "y" from the wordmark -->
<defs><linearGradient id="ie" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa36e"/><stop offset="1" stop-color="#ff5a1f"/></linearGradient></defs>
<rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#111317" stroke="url(#ie)" stroke-width="2"/>
<g transform="translate(9 6.5) scale(.255) translate(-130 -2)">{inner}</g></svg>'''
open(f"{out}/buyai-icon.svg","w").write(icon)
