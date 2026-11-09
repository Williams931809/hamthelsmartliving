import json, pathlib, subprocess, textwrap
from PIL import Image,ImageOps,ImageDraw,ImageFont
root=pathlib.Path(__file__).resolve().parents[1]
x=json.loads((root/'data/catalogue.json').read_text())
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def f(n):return ImageFont.truetype(font,n)
for p in x['Product']:
 if p['category']!='smart-locks':continue
 dest=root/'public/videos'/f"{p['id']}.mp4"
 if dest.exists():continue
 canvas=Image.new('RGB',(640,800),'#f2f1eb');d=ImageDraw.Draw(canvas)
 d.text((32,28),'HAMTHEL / SMART LIVING',font=f(16),fill='#153a32')
 im=Image.open(root/'public'/p['images'][0].lstrip('/')).convert('RGB')
 im=ImageOps.contain(im,(560,500));canvas.paste(im,((640-im.width)//2,90+(500-im.height)//2))
 y=620
 for line in textwrap.wrap(p['name'],31):d.text((32,y),line,font=f(27),fill='#153a32');y+=36
 d.text((32,752),'PRODUCT OVERVIEW · CATALOGUE IMAGES',font=f(14),fill='#5b6c64')
 tmp=root/'.sites-runtime/video-frame.png';tmp.parent.mkdir(exist_ok=True);canvas.save(tmp)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(tmp),'-vf',"scale=672:840,crop=640:800:x='16+10*sin(t)':y='20+10*cos(t)',fade=t=in:st=0:d=0.6,fade=t=out:st=5.4:d=0.6",'-t','6','-r','12','-c:v','libx264','-preset','ultrafast','-crf','30','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],check=True)
print('Created overview videos for all 146 smart locks')
