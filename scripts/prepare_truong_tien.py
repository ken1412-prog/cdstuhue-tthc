#!/usr/bin/env python3
"""Prepare REAL Trường Tiền bridge photo and light-only mask.

Source is an actual long exposure photo by Lưu Ly, released to public domain:
https://commons.wikimedia.org/wiki/File:Cau_Trang_tien_ve_dem.jpg
No AI image is involved. Crop framing is controlled by CSS, not baked into file.
"""
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT=Path(__file__).resolve().parents[1]/"site"/"assets"/"img"


def create(source):
    with Image.open(source) as image:
        img=ImageOps.exif_transpose(image).convert("RGB")
    src_size=img.size
    max_w=1580
    if img.width>max_w:
        img=img.resize((max_w, round(img.height*max_w/img.width)),Image.Resampling.LANCZOS)
    original=np.asarray(img,dtype=np.float32)/255.0
    r,g,b=(original[:,:,i] for i in range(3))
    lum=.2126*r+.7152*g+.0722*b
    mx=np.max(original,axis=2)
    mn=np.min(original,axis=2)
    contrast=np.maximum(mx-mn,.00001)
    warm=np.clip((r-np.maximum(g,b)*.95)*4.2,0,1)*np.clip((lum-.09)*4,0,1)
    gold=np.clip((np.minimum(r,g)-b*.88)*3.2,0,1)*np.clip((lum-.11)*4,0,1)
    warm=np.maximum(warm,gold*.74)
    cool=np.stack([
        .76*r + .018,
        .95*g + .031,
        np.minimum(1,.98*b+.065)
    ],axis=2)
    # Avoid a flat opaque gradient: grading follows real sensor pixels,
    # preserving structural detail and river reflections.
    cool=np.clip(cool*(.98 + .19*np.clip(lum*2,0,1))[...,None],0,1)
    hot=np.stack([
        np.minimum(1,r*1.25+.07),
        np.minimum(1,g*1.12+.014),
        np.maximum(0,b*.74)
    ],axis=2)
    mix=np.clip(warm*.82,0,.85)
    color=cool*(1-mix[...,None])+hot*mix[...,None]

    # The real long-exposure image has blue/purple lamps. Select only its
    # existing bright truss pixels, then grade those captured lamps through
    # warm red -> orange -> gold along the actual bridge. No painted arches.
    h,w=lum.shape
    ys=np.arange(h,dtype=np.float32)[:,None]/h
    xs=np.arange(w,dtype=np.float32)[None,:]/w
    # Trusses in the photographed frame occupy a narrow line near y=.50.
    # An absolute intensity threshold prevents the dusk sky being painted gold.
    arch_band=np.clip((ys-.443)*80,0,1)*np.clip((.595-ys)*63,0,1)
    bright=np.clip((mx-.59)*5.0,0,1)
    chroma=np.clip((contrast-.065)*4.0,0,1)
    truss=np.clip(arch_band * bright * np.maximum(chroma,.57) * 1.18,0,.95)
    truss=truss * np.clip((.94-xs)*8,0,1)
    amber_green=np.clip(.28+.66*xs, .28, .85)
    warm_tone=np.stack([
        np.broadcast_to(np.full_like(amber_green,.99),color.shape[:2]),
        np.broadcast_to(amber_green,color.shape[:2]),
        np.broadcast_to(np.full_like(amber_green,.10),color.shape[:2])
    ],axis=-1)
    # Preserve captured metalwork contrast, not a solid line drawn over it.
    graded=warm_tone*(.50+.50*mx[...,None])
    color=color*(1-truss[...,None])+graded*truss[...,None]
    output=Image.fromarray(np.uint8(np.clip(color*255+.5,0,255)),"RGB")
    output=ImageEnhance.Contrast(output).enhance(1.11)
    output=ImageEnhance.Sharpness(output).enhance(1.23)
    name=ROOT/"truong-tien-real-neon.webp"
    output.save(name,"WEBP",quality=87,method=6)

    # Matte represents only real captured bridge lights; it is not an
    # invented arc or a replacement bridge. The moving streak travels over
    # those bright pixels. Sky and river outside the bridge remain transparent.
    h,w=lum.shape
    yy=np.arange(h,dtype=np.float32)[:,None]/h
    band=np.clip((yy-.15)*23,0,1)*np.clip((.72-yy)*14,0,1)
    colorful=np.clip((contrast-.035)*3.0,0,1)
    highlight=np.clip((mx-.45)*3.0,0,1)
    luminous=np.maximum(np.maximum(warm,gold),colorful*.48)*highlight
    # Bright whites of the real metal rails also receive a little sheen.
    luminous=np.maximum(luminous,np.clip((lum-.58)*2.2,0,1)*.46)
    alpha=np.uint8(np.clip(luminous*band*230,0,230))
    matte=Image.fromarray(alpha,"L").filter(ImageFilter.GaussianBlur(1.0))
    rgba=Image.new("RGBA",img.size,(255,239,200,0))
    rgba.putalpha(matte)
    mask=ROOT/"truong-tien-arc-light.webp"
    rgba.save(mask,"WEBP",quality=78,alpha_quality=78,method=6)

    details={"original":src_size,"output":img.size,
      "photo_bytes":name.stat().st_size,"light_mask_bytes":mask.stat().st_size,
      "source":"Real photo by Lưu Ly, public domain, Wikimedia Commons"}
    if name.stat().st_size>850000 or mask.stat().st_size>220000:
        raise RuntimeError("Real bridge assets exceed optimization limits "+repr(details))
    print("REAL_TRUONG_TIEN_READY "+json.dumps(details,ensure_ascii=False))


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",required=True)
    args=parser.parse_args()
    create(args.source)
