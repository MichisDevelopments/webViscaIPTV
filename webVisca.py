from flask import Flask, render_template, request, jsonify

import sys
sys.path.insert(0, './libs')

import datetime
import time
import webViscaIpLayer
import logging

logger = logging.getLogger('webVisca')
logger.addHandler(webViscaIpLayer.setLogging(logger))
logger.setLevel(logging.INFO)


serialString = ""
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

Visca = webViscaIpLayer.VSC()

if not Visca.createConnection():
    logger.error('Could not connect to a camera.')

#Visca.inqAllParameters()

@app.route("/")
def hello():
    now = datetime.datetime.now()
    timeString = now.strftime("%Y-%m-%d %H:%M:%S")
    templateData = {
        'title': 'webVisca Camera Control',
        'serialPort': 'N/A',
    }
    return render_template('main.html', **templateData)

@app.route("/test")
def testing():
    return render_template('test.html')

@app.route("/camera/<cmd>", methods=['POST', 'GET'])
def camera(cmd):
    camera = request.args.get('camera', default=0, type=int)
    speedp = request.args.get('speedp', default=0, type=int)
    speedt = request.args.get('speedt', default=0, type=int)
    speedz = request.args.get('speedz', default=0, type=int)
    synczoom = request.args.get('synczoom', default='', type=int)
    widezoom = request.args.get('widezoom', default='', type=int)
    prepreset = request.args.get('prepreset', default='', type=int)
    name = request.args.get('name', default='', type=str)
    changeptz = request.args.get('changeptz', default=0, type=int)

    direction = request.args.get('direction', default='', type=str)
    command = request.args.get('command', default='', type=str)
    preset = request.args.get('preset', default='', type=int)

    cameraname = request.args.get('name', default='', type=str)
    cameraip = request.args.get('cameraip', default='', type=str)
    cameraport = request.args.get('cameraport', default='', type=int)

    result = ''

    if cmd == 'getVersion':
        info = {
            'vendor': '-',
            'model': '-',
            'romVersion': '-',
            'maxSocket': '-'
        }

        result = Visca.inqCamVersion(camera=camera)

        if len(result['response']) == 14:
            info = {
                'vendor': result['response'][0:4],
                'model': result['response'][4:8],
                'romVersion': result['response'][8:12],
                'maxSocket': result['response'][12:14]
            }

        result = info

    if cmd == 'moveControl':
        result = Visca.simpleMovement(
            camera=camera,
            direction=direction,
            speedp=speedp,
            speedt=speedt
        )
        if result:
            result = {
                'status': 'OK'
            }
        else:
            result = {
                'status': 'IGNORED'
            }

    if cmd == 'zoomControl':
        result = Visca.simpleZoom(
            camera=camera,
            direction=direction,
            speedz=speedz,
        )
        if result:
            result = {
                'status': 'OK'
            }
        else:
            result = {
                'status': 'IGNORED'
            }

    if cmd == 'executePreset':
        result = Visca.executePreset(
            camera=camera,
            preset=preset
        )
        if result:
            result = {
                'status': 'OK'
            }
        else:
            result = {
                'status': 'IGNORED'
            }

    if cmd == 'edtPreset':
        result = Visca.getEditPresets(preset=preset)

    if cmd == 'getPresets':
        result = Visca.getPresets(camera=camera)

    if cmd == 'delPreset':
        result = Visca.delPreset(preset=preset)

    if cmd == 'addPreset':
        result = Visca.addPresets(
            camera=camera,
            speedp=speedp,
            speedt=speedt,
            prepreset=prepreset,
            name=name,
            synczoom=synczoom,
            widezoom=widezoom,
            changeptz=changeptz
        )

    if cmd == 'addCamera':
        result = Visca.addCamera(
            cameraname=cameraname,
            cameraip=cameraip,
            cameraport=cameraport
        )

    if cmd == 'delCamera':
        result = Visca.delCamera(camera=camera)

    if cmd == 'getCameras':
        result = Visca.getCameras()

    if cmd == 'cmdCancel':
        result = Visca.cmdCancel()

    if cmd == 'checkConnection':
        result = Visca.checkConnection(camera)
        if result:
            result = {
                'status': 'CONNECTED'
            }
        else:
            result = {
                'status': 'DISCONNECTED'
            }
    return jsonify(result)


if __name__ == "__main__":
    from waitress import serve
    serve(app, host='0.0.0.0', port=80)


