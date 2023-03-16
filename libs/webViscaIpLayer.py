import camera
import logging
import sys
import json
import os
import inspect
from datetime import datetime
import time

class VSC:
    def __init__(self):
        self.__LOCKED = []
        self.__checkInterval = 0.1  # in seconds
        self.__maxWaitTime = 10  # seconds
        self.__RESPONSEQUEUE = []
        self.__COMPQUEUE = []

        self.__FileName = inspect.getframeinfo(inspect.currentframe()).filename
        self.__Path = os.path.dirname(os.path.abspath(self.__FileName))
        self.__ConfigFile = self.__Path + '//webViscaConfig.json'

        self.__Presets = {}
        self.__CONFIG = {}

        self.__ACTIVECAM = 0
        self.__CAMERA = None
        self.__CAMCON = []

        if os.path.isfile(self.__ConfigFile):
            self.getPresets()
        else:
            self.__Presets = dict(
                cameras=[
                    {
                        'IP': '192.168.0.101',
                        'PORT': 52381,
                        'NAME': 'MAINCAM'
                    }
                ],
                presets=[
                    {
                        'CAMERA': 0,
                        'PAN': 0,
                        'PANSPEED': 12,
                        'TILT': 0,
                        'TILTSPEED': 10,
                        'ZOOM': 0,
                        'NAME': 'Default',
                        'SYNCZOOM': 0,
                        'WIDEZOOM': 0,
                        'PREPRESET': ''
                    }
                ]
            )
            self.setPresets()
            logger.info('new configfile {} created'.format(self.__ConfigFile))

    def init(self):
        return True

    def readConfig(self, configfile=''):
        try:
            f = open(self.__ConfigFile, "r")
            self.__CONFIG = json.load(f)
            f.close()
            return True
        except Exception as e:
            logger.error('Configfile {} seems to be not readable: {}'.format(self.__ConfigFile, str(e)))
            return False

    def writeConfig(self, configfile=''):
        try:
            f = open(self.__ConfigFile, "w")
            json.dump(self.__CONFIG, f, indent=4, sort_keys=True)
            f.close()
            return True
        except Exception as e:
            logger.error('Configfile {} seems to be not writeable: {}'.format(self.__ConfigFile, str(e)))
            return False

    def getCameras(self):
        if self.readConfig(self.__ConfigFile):
            self.__Presets['cameras'] = self.__CONFIG['cameras']
            result = []
            for i in self.__Presets['cameras']:
                result.append(i['NAME'])
            return result
        else:
            return False

    def getEditPresets(self, preset=None):
        if self.readConfig(self.__ConfigFile):
            self.__Presets['presets'] = self.__CONFIG['presets']
            return self.__Presets['presets'][preset]
        else:
            return False

    def getPresets(self, camera=0):
        if self.readConfig(self.__ConfigFile):
            self.__Presets['presets'] = self.__CONFIG['presets']
            result = {}
            pos = 0
            for i in self.__Presets['presets']:
                if i['CAMERA'] == camera:
                    result[pos] = i['NAME']
                pos += 1

            return result
        else:
            return False

    def setCameras(self):
        self.__CONFIG['cameras'] = self.__Presets['cameras']
        if self.writeConfig(self.__ConfigFile):
            logger.debug('Config written to {}'.format(self.__ConfigFile))
        else:
            logger.error('Config not written to'.format(self.__ConfigFile))

    def setPresets(self):

        self.__CONFIG['presets'] = sorted(self.__Presets['presets'], key = lambda d: (d['NAME'].lower()))

        if self.writeConfig(self.__ConfigFile):
            logger.debug('Config written to {}'.format(self.__ConfigFile))
            return True
        else:
            logger.error('Config not written to'.format(self.__ConfigFile))
            return False

    def delCamera(self,camera=None):
        del self.__CONFIG['cameras'][camera]
        self.setPresets()
        self.createConnection()

    def delPreset(self,preset=None):
        del self.__Presets['presets'][preset]
        self.setPresets()

    def addCamera(self,
        cameraname='',
        cameraip='',
        cameraport=''):
        self.__Presets['cameras'].append(dict(
            IP=cameraip,
            NAME=cameraname,
            PORT=cameraport
        ))

        self.setPresets()
        self.createConnection()

    def addPresets(self,
        camera=0,
        speedp=12,
        speedt=12,
        prepreset='',
        name='',
        synczoom='off',
        widezoom='off',
        changeptz=0):

        if self.__CAMCON[camera] is not None:
            pt = self.__CAMCON[camera].get_pantilt_position()
            pan = pt[0]
            tilt = pt[1]
            zoom = self.__CAMCON[camera].get_zoom_position()

            if pan < 0:
                pan = 65535 + pan

            if tilt < 0:
                tilt = 65535 + tilt

            #todo: check, if name already exists. If so, overwrite preset otherwise create new one

            data = next((index for (index, d) in enumerate(self.__Presets['presets']) if d["NAME"] == name), None)
            if (data):
                if not changeptz:
                    pan = self.__Presets['presets'][data]['PAN']
                    tilt = self.__Presets['presets'][data]['TILT']
                    zoom = self.__Presets['presets'][data]['ZOOM']

                self.__Presets['presets'][data] = (
                    dict(
                        CAMERA=camera,
                        PAN=pan,
                        PANSPEED=speedp,
                        TILT=tilt,
                        TILTSPEED=speedt,
                        ZOOM=zoom,
                        NAME=name,
                        SYNCZOOM=synczoom,
                        WIDEZOOM=widezoom,
                        PREPRESET=prepreset
                    )
                )
            else:
                self.__Presets['presets'].append(dict(
                    CAMERA=camera,
                    PAN=pan,
                    PANSPEED=speedp,
                    TILT=tilt,
                    TILTSPEED=speedt,
                    ZOOM=zoom,
                    NAME=name,
                    SYNCZOOM=synczoom,
                    WIDEZOOM=widezoom,
                    PREPRESET=prepreset
                    )
                )

        self.setPresets()

    def reConnect(self,camera=0):
        cameras = self.__Presets['cameras'][camera]
        try:
            self.__CAMCON[camera] = camera.Camera(
                ip=cameras['IP'],
                port=cameras['PORT'],
                mode='tcp'
            )
            return True

        except Exception as e:
            logger.error(str(e))
            return False

    def createConnection (self):
        self.getCameras()
        gotOneConnection = False

        for cameras in self.__Presets['cameras']:
            try:
                self.__CAMCON.append(camera.Camera(
                    ip=cameras['IP'],
                    port=cameras['PORT'],
                    mode='tcp'
                ))
                self.__LOCKED.append(False)
                gotOneConnection = True
            except Exception as e:
                logger.error('Could not connect to camera ({}): {}'.format(cameras['NAME'],str(e)))
                self.__CAMCON.append(None)
                self.__LOCKED.append(False)
        if gotOneConnection:
            return True
        else:
            return False

    def checkConnection(self, camera=0):
        logger.debug('Check connection for camera {}'.format(camera))
        if camera < len(self.__CAMCON):
            if len(self.__CAMCON) > 0:
                if self.__CAMCON[camera] is not None:
                    if self.__CAMCON[camera]._sock._closed:
                        logger.debug('socked seems to be closed')
                        self.reConnect(camera)
                        return False
                    else:
                        logger.debug('socked seems to be open')
                        return True
            else:
                self.requestUnLock(camera=camera)
        return False

    def requestLock(self, camera=0, timeout=90):
        logger.debug('requesting lock for camera {}'.format(camera))
        ts = datetime.now().timestamp()
        while self.__LOCKED[camera]:
            if (datetime.now().timestamp() - ts) > timeout:
                logger.error('Timeout while waiting for Lock')
                return False
            time.sleep(0.25)
        self.__LOCKED[camera] = True
        logger.debug('got lock for camera {}'.format(camera))
        return True

    def requestUnLock(self, camera=0):
        logger.debug('set unlock for camera {}'.format(camera))
        self.__LOCKED[camera] = False
        return True

    def simpleZoom(self, camera, direction, speedz):
        if self.checkConnection(camera):

            try:
                if self.requestLock(timeout=10, camera=camera):

                    if direction == 'STOP':
                        speedz = 0

                    if direction == 'WIDE':  # Values between 0 - 7 negative values are WIDE positives are ZOOM in
                        speedz = speedz * -1

                    self.__CAMCON[camera].zoom(speedz)
                    self.searchForComp(camera=camera, timeout=1)

                    self.requestUnLock(camera=camera)

                    return True
                return False

            except ConnectionResetError:
                logger.error('Connection were closed to camera {}, try reconnect'.format(camera))
                self.requestUnLock(camera=camera)
                self.reConnect(camera)
                return False

            except Exception as e:
                logger.error(str(e))
                self.requestUnLock(camera=camera)
                return False
        else:
            return False

    def simpleMovement(self, camera, direction, speedp, speedt):
        if self.checkConnection(camera):
            try:
                if self.requestLock(timeout=10, camera=camera):
                    if direction == 'STOP' or direction == 'C':
                        zoom = 1
                    else:
                        zoom = 1 - (self.__CAMCON[camera].get_zoom_position() / 16384)

                    logger.debug('Got command {}'.format(direction))

                    speedp = round(speedp * zoom) + 1
                    speedt = round(speedt * zoom) + 1

                    if direction == 'STOP' or direction == 'C':
                        speedp = 0
                        speedt = 0

                    if direction == 'N':
                        speedp = 0

                    if direction == 'E':
                        speedt = 0
                        speedp = speedp * -1

                    if direction == 'NE' or direction == 'SE':
                        speedp = speedp * -1

                    if direction == 'S':
                        speedp = 0
                        speedt = speedt * -1

                    if direction == 'SW' or direction == 'SE':
                        speedt = speedt * -1

                    if direction == 'W':
                        speedt = 0

                    self.__CAMCON[camera].pantilt(
                        pan_speed=speedp,
                        tilt_speed=speedt
                    )

                    self.searchForComp(camera=camera, timeout=1)

                    self.requestUnLock(camera=camera)
                    return True
                return False

            except ConnectionResetError:
                logger.error('Connection were closed to camera {}, try reconnect'.format(camera))
                self.requestUnLock(camera=camera)
                self.reConnect(camera)
                return False

            except Exception as e:
                logger.error(str(e))
                self.requestUnLock(camera=camera)
                return False
        else:
            return False

    def searchForComp(self, camera=0, timeout=90):
        try:
            ts = datetime.now().timestamp()
            logger.debug('Searching for  COMP message')
            while True:
                ack = self.__CAMCON[camera]._receive_response()
                if (datetime.now().timestamp() - ts) > timeout:
                    logger.error('Timeout while waiting for COMP Message')
                    return False

                if ack is None:
                    continue

                if (ack.hex() == '9051ff'):
                    logger.debug('Got COMP message')
                    return True
        except ConnectionResetError:
            logger.error('Connection were closed to camera {}, try reconnect'.format(camera))
            self.requestUnLock(camera=camera)
            self.reConnect(camera)
            return False

        except:
            return False

    def executePreset(self, camera=0, preset=0, timeout=90):
        if self.checkConnection(camera):
            logger.debug('executing preset {}'.format(preset))
            try:
                if self.requestLock(timeout=10, camera=camera):
                    i = self.__Presets['presets'][preset]
                    # if no WIDEZOOM before moving ignore it
                    if i['WIDEZOOM']:
                        logger.debug('Zooming wide before moving')
                        self.__CAMCON[camera].zoom_to(position=0)
                        self.searchForComp(camera=camera)

                    # call executing prepreset
                    if i['PREPRESET']:
                        #unlock for pre preset command execution
                        self.requestUnLock(camera=camera)
                        self.executePreset(camera=camera, preset=i['PREPRESET'])
                        # re-request Lock
                        if not self.requestLock(timeout=10, camera=camera):
                            return False
                    zoom = self.__CAMCON[camera].get_zoom_position()
                    pt = self.__CAMCON[camera].get_pantilt_position()
                    if pt[0] < 0:
                        pan = 65535 + pt[0]
                    else:
                        pan = pt[0]

                    if pt[1] < 0:
                        tilt = 65535 + pt[1]
                    else:
                        tilt = pt[1]

                    waitForComp = False
                    waitForZoomComp = False

                    if zoom != i['ZOOM']:
                        waitForZoomComp = True
                    else:
                        logger.debug('no zooming because no position change needed')

                    if pan != i['PAN'] or tilt != i['TILT']:
                        # go to the position
                        logger.debug('now positioning cam')
                        self.__CAMCON[camera].pantilt(
                            pan_speed=i['PANSPEED'],
                            tilt_speed=i['TILTSPEED'],
                            pan_position=i['PAN'],
                            tilt_position=i['TILT'],
                            relative=False
                        )
                        waitForComp = True
                    else:
                        logger.debug('no moving because no position change needed')

                    # if synczoom do zoom immediately after move command were send
                    if i['SYNCZOOM']:
                        logger.debug('Zooming while moving')
                        logger.debug('now zooming')
                        self.__CAMCON[camera].zoom_to(position=i['ZOOM'] / 16384)
                        if waitForZoomComp:
                            self.searchForComp(camera=camera)
                            waitForZoomComp = False
                    else:
                        # otherwise wait for comp message
                        logger.debug('Zooming after moving')
                        if waitForComp:
                            self.searchForComp(camera=camera)
                            waitForComp = False

                        logger.debug('now zooming')
                        self.__CAMCON[camera].zoom_to(position=i['ZOOM'] / 16384)

                    if waitForComp or waitForZoomComp:
                        self.searchForComp(camera=camera)

                    self.requestUnLock(camera=camera)
                    return True
                return False

            except ConnectionResetError:
                logger.error('Connection were closed to camera {}, try reconnect'.format(camera))
                self.requestUnLock(camera=camera)
                self.reConnect(camera)
                return False

            except Exception as e:
                logger.debug(str(e))
                self.requestUnLock(camera=camera)
                return False
        else:
            return False

def loggingExeption(module='', message=''):
    logger.error('{} at {}'.format(message, module))

def setLogging(logger):
    logger.setLevel(logging.DEBUG)
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter('%(asctime)s|%(name)-22s|%(levelname)-8s|%(message)s'))
    return ch

def setLoggingLevel(level):
    """
    CRITICAL    50
    ERROR       40
    WARNING     30
    INFO        20
    DEBUG       10
    NOTSET      0

    :param level:
    :return:
    """

    try:
        logger.setLevel(level)
        return True
    except Exception as e:
        logger.error(sys._getframe().f_code.co_name + ': ' + str(e))
        return False


logger = logging.getLogger('webViscaLayer')
logger.addHandler(setLogging(logger))
