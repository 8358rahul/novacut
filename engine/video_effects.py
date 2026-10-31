"""Original FFmpeg treatments. These are not CapCut shaders or parity claims."""
import math

SUPPORTED_EFFECTS = (
    'none',
    # Trending & Beat
    'chromatic_flash', 'diamond_zoom', 'halo_blur', 'strobe_flash', 'black_flash',
    'beat_bounce', 'glow_edge',
    # Glitch & Cyber
    'glitch', 'cyber_scanlines', 'crt_noise', 'matrix_rain', 'data_mosh',
    'bad_tv', 'vcr_distortion', 'chroma_drift',
    # Retro & Film
    'film_grain', 'retro_vhs', 'film_burn', 'light_leak', 'super_8',
    'sepia_dust', 'scratch_film', 'vintage_1998', 'polaroid_fade',
    # Bling & Stars
    'sparkle_glow', 'lens_flare', 'dreamy_aura', 'gold_glitter', 'diamond_prism', 'heart_bokeh',
    # Motion & Shake
    'camera_shake', 'zoom_blur', 'earthquake', 'vertigo_warp', 'speed_lines',
    'twitch_jolt', 'directional_blur',
    # Distortion & Warp
    'fisheye_lens', 'ripple_wave', 'swirl_vortex', 'kaleidoscope', 'mirror_reflection',
    # Party & Mood
    'disco_strobe', 'club_lights', 'thermal_vision', 'ghost_echo', 'color_inversion',
    # Atmosphere & Weather
    'soft_mist', 'cyber_smoke', 'heatwave', 'neon_edge', 'rain_drops',
    'snow_flurry', 'fire_ember', 'sun_rays',
    # Split & Borders
    'split_2_horizontal', 'split_2_vertical', 'split_4_quad', 'split_9_grid',
    'cinema_widescreen', 'film_sprocket',
    # Comic & Stylize
    'manga_sketch', 'pop_art_poster', 'halftone_dot', 'oil_painting', 'cartoon_contour',
)


def effect_filters(effect, intensity):
    if effect not in SUPPORTED_EFFECTS:
        raise ValueError(f'Unsupported effect: {effect}')
    amount = max(0, min(1, float(intensity)))
    if not math.isfinite(amount):
        raise ValueError('Invalid effect intensity')
    if amount == 0 or effect == 'none':
        return ''

    noise = max(1, round(amount * 30))

    filters = {
        # Trending & Beat
        'chromatic_flash': f"rgbashift=rh={round(amount*12)}:bh={-round(amount*12)}:enable='lt(mod(t,1),0.25)'",
        'diamond_zoom': f"gblur=sigma={amount*2},lenscorrection=k1={amount*0.2}:k2={amount*0.1}",
        'halo_blur': f'gblur=sigma={amount*3},eq=brightness={amount*.04}',
        'strobe_flash': f"eq=brightness='{amount*0.7}*lt(mod(t*6,1),0.2)'",
        'black_flash': f"eq=brightness='{-amount*0.8}*lt(mod(t*6,1),0.2)'",
        'glow_edge': f"edgedetect=low=0.1:high=0.3:mode=colormix,eq=saturation={1+amount}",

        # Glitch & Cyber
        'glitch': f'rgbashift=rh={round(amount*12)}:bh={-round(amount*12)}:edge=wrap',
        'cyber_scanlines': f'drawgrid=width=iw:height=6:thickness=1:color=cyan@{amount*.4}',
        'crt_noise': f'noise=alls={noise * 2}:allf=t+u:all_seed=11,eq=saturation={1-amount*.7}',
        'matrix_rain': f"drawgrid=width=12:height=16:thickness=1:color=lime@{amount*.4},colorbalance=gs={amount*.25}",
        'data_mosh': f"bwdif=mode=1,rgbashift=rh={round(amount*16)}:gh={-round(amount*8)}:bh={round(amount*12)}",
        'bad_tv': f"noise=alls={noise*2}:allf=t,curves=all='0/0 0.5/0.45 1/1',eq=contrast={1+amount*.4}",
        'vcr_distortion': f"chromashift=cbh={round(amount*10)}:crh={-round(amount*10)},drawgrid=width=iw:height=4:thickness=1:color=black@{amount*.3}",
        'chroma_drift': f"rgbashift=rh={round(amount*14)}:bh={-round(amount*14)},chromashift=cbh={round(amount*6)}",

        # Retro & Film
        'film_grain': f'noise=alls={noise}:allf=t+u:all_seed=7',
        'retro_vhs': f'noise=alls={noise}:allf=t:all_seed=3,chromashift=cbh={round(amount*6)}:crh={-round(amount*6)},eq=saturation={1-amount*.35}',
        'film_burn': f"eq=brightness='{amount*.15}*(1+sin(t*3))':eval=frame,colorbalance=rs={amount*.25}:bs={-amount*.15}",
        'light_leak': f"drawbox=x=0:y=0:w=iw/4:h=ih:color=orange@{amount*.25}:t=fill",
        'super_8': f"noise=alls={noise}:allf=t+u,colorbalance=rs={amount*.2}:gs={amount*.1}:bs={-amount*.2},eq=contrast={1+amount*.2}",
        'sepia_dust': f"colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,noise=alls={noise}:allf=t",
        'scratch_film': f"noise=alls={noise}:allf=t,drawbox=x='mod(t*197,iw)':y=0:w=2:h=ih:color=white@{amount*.4}:t=fill",
        'vintage_1998': f"colorbalance=rs={amount*.15}:bs={-amount*.15},eq=saturation={1-amount*.25}:contrast={1+amount*.15}",
        'polaroid_fade': f"curves=all='0/0.08 0.5/0.5 1/0.92',colorbalance=bs={amount*.15}:rs={amount*.08}",

        # Bling & Stars
        'sparkle_glow': f"gblur=sigma={amount*2.5},eq=brightness={amount*.08}:contrast={1+amount*.25}",
        'lens_flare': f"drawbox=x=0:y='ih/2-8':w=iw:h=16:color=cyan@{amount*.3}:t=fill,gblur=sigma={amount*3}",
        'dreamy_aura': f'gblur=sigma={amount*2},eq=saturation={1+amount*.2}:brightness={amount*.05}',
        'gold_glitter': f"gblur=sigma={amount*1.8},colorbalance=rs={amount*.3}:gs={amount*.2}:bs={-amount*.3}",
        'diamond_prism': f"rgbashift=rh={round(amount*10)}:bh={-round(amount*10)},lenscorrection=k1={amount*0.1}",
        'heart_bokeh': f"gblur=sigma={amount*3},eq=brightness={amount*.05}:saturation={1+amount*.2}",

        # Motion & Shake
        'zoom_blur': f"lenscorrection=k1={amount*0.25}:k2={amount*0.15}",
        'vertigo_warp': f"lenscorrection=k1={-amount*0.2}:k2={amount*0.15}",
        'speed_lines': f"drawgrid=width=8:height=ih:thickness=1:color=white@{amount*.25}",
        'directional_blur': f"gblur=steps=2:sigma={amount*4}",

        # Distortion & Warp
        'fisheye_lens': f"lenscorrection=cx=0.5:cy=0.5:k1={amount*0.4}:k2={amount*0.2}",
        'ripple_wave': f"lenscorrection=k1={amount*0.18}:k2={amount*0.09}",
        'swirl_vortex': f"lenscorrection=k1={amount*0.35}:k2={-amount*0.2}",
        'kaleidoscope': f"lenscorrection=k1={amount*0.3}:k2={amount*0.2}",
        'mirror_reflection': f"crop=iw/2:ih:0:0,split[l1][l2];[l2]hflip[r];[l1][r]hstack",

        # Party & Mood
        'disco_strobe': f"hue=h='t*90':s={1+amount*0.5}",
        'club_lights': f"hue=h='t*180':s={1+amount},eq=brightness='0.1*sin(t*8)'",
        'thermal_vision': f"lutrgb=r='val':g='255-val':b='255-val',eq=contrast=2",
        'ghost_echo': f"tblend=all_mode=average,eq=contrast={1+amount*.2}",
        'color_inversion': "eq=contrast=-1:brightness=1",

        # Atmosphere & Weather
        'soft_mist': f'gblur=sigma={amount*1.5},eq=contrast={1-amount*.15}:brightness={amount*.06}',
        'cyber_smoke': f'gblur=sigma={amount*2},colorbalance=bs={amount*.25}:gs={amount*.15}',
        'heatwave': f"eq=brightness='0.05*sin(t*8)':contrast={1+amount*.1},colorbalance=rs={amount*.2}:bs={-amount*.1}",
        'neon_edge': f'edgedetect=low={.1*amount}:high={.4*amount}:mode=colormix',
        'rain_drops': f"drawgrid=width=12:height=24:thickness=1:color=white@{amount*.15},noise=alls={noise}:allf=t",
        'snow_flurry': f"noise=alls={noise*2}:allf=t+u,eq=brightness={amount*.05}",
        'fire_ember': f"colorbalance=rs={amount*.35}:gs={amount*.1}:bs={-amount*.3},noise=alls={noise}:allf=t",
        'sun_rays': f"eq=brightness={amount*.08}:contrast={1+amount*.2},colorbalance=rs={amount*.2}:gs={amount*.15}:bs={-amount*.15}",

        # Split Screen & Borders
        'split_2_horizontal': f"drawgrid=width=iw:height=ih/2:thickness=2:color=white@{amount}",
        'split_2_vertical': f"drawgrid=width=iw/2:height=ih:thickness=2:color=white@{amount}",
        'split_4_quad': f"drawgrid=width=iw/2:height=ih/2:thickness=2:color=white@{amount}",
        'split_9_grid': f"drawgrid=width=iw/3:height=ih/3:thickness=2:color=white@{amount}",
        'cinema_widescreen': f"drawbox=x=0:y=0:w=iw:h=ih*0.12:color=black:t=fill,drawbox=x=0:y=ih*0.88:w=iw:h=ih*0.12:color=black:t=fill",
        'film_sprocket': f"drawbox=x=0:y=0:w=20:h=ih:color=black:t=fill,drawbox=x=iw-20:y=0:w=20:h=ih:color=black:t=fill,drawgrid=width=20:height=20:thickness=2:color=white@{amount*.8}",

        # Comic & Art Stylize
        'manga_sketch': "edgedetect=low=0.1:high=0.3:mode=wires,eq=contrast=2",
        'pop_art_poster': "lutrgb=r='bitand(val,192)':g='bitand(val,192)':b='bitand(val,192)',hue=s=2",
        'halftone_dot': f"edgedetect=low=0.1:high=0.4:mode=colormix,noise=alls={noise*2}:allf=t",
        'oil_painting': f"hqdn3d=luma_spatial={amount*10}:chroma_spatial={amount*10},eq=saturation=1.4",
        'cartoon_contour': "edgedetect=low=0.1:high=0.3:mode=colormix,eq=contrast=1.3:saturation=1.5",
    }

    if effect in ('camera_shake', 'earthquake', 'beat_bounce', 'twitch_jolt'):
        if effect == 'camera_shake':
            amplitude = amount * 6
            return (f",pad=iw+32:ih+32:16:16:color=black,"
                    f"crop=iw-32:ih-32:x='16+{amplitude}*sin(t*43)':y='16+{amplitude}*cos(t*37)'")
        elif effect == 'earthquake':
            amplitude = amount * 12
            return (f",pad=iw+32:ih+32:16:16:color=black,"
                    f"crop=iw-32:ih-32:x='16+{amplitude}*sin(t*43)':y='16+{amplitude}*cos(t*37)'")
        elif effect == 'beat_bounce':
            bounce = amount * 12
            return (f",pad=iw+32:ih+32:16:16:color=black,"
                    f"crop=iw-32:ih-32:x='16':y='16+{bounce}*sin(t*12)'")
        elif effect == 'twitch_jolt':
            jolt = amount * 14
            return (f",pad=iw+32:ih+32:16:16:color=black,"
                    f"crop=iw-32:ih-32:x='16+{jolt}*sin(t*57)':y='16+{jolt}*cos(t*51)'")

    return ',' + filters[effect]


def color_filters(adjustments):
    if not adjustments:
        return ''
    brightness = max(-1, min(1, adjustments['brightness']))
    contrast = max(0, min(4, adjustments['contrast']))
    saturation = max(0, min(4, adjustments['saturation']))
    temperature = max(-1, min(1, adjustments['temperature']))
    return (f',eq=brightness={brightness}:contrast={contrast}:saturation={saturation}'
            f',colorbalance=rs={temperature*.25}:bs={-temperature*.25}')
