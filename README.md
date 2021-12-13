# Hue Control - Home Lightting Control for Hue Bridge v1

A browser based app that can be used to freely define and activate scenes for the Phillips Hue system and stores them directly on the hue bridge.

_This app is currently only tested with the hue bridge version 1. It may or may not work with newer bridge versionss._

## Function

This app has two modes:

1. Control Mode
2. Configuration Mode

Control mode shows all scenes defined by the user that connects to the bridge as tiles. The user activates scenes by tapping on the tile.

Configuration mode allows to create and configure light scenes, create and edit groups and rename lights on the hue bridge.

This app stores all its data on the hue bridge, except for the user and the bridge address.

## Information Storage

The bridge address and the user string cannot be stored on the bridge for obvious reasons, so these are the only pieces of information that must be kept outside the bridge.
There are two possible ways of storing the information:

1. The information is stored locally in the browser and nowhere else.
2. A data storage service is used to store this part of the configuration.

Storing the information in the application has some major downsides:

- For each device/browser that uses the app, or if the browser data is cleared, a separate user on the bridge needs to be created.
- By default only the scenes of the logged in user are shown, as for example the default hue app creates a huge number of room specific scenes with the same name.
- You need to scan for the bridge or enter its IP adress every time the app is used on a different device or browser.

When using a storage service, one bridge user is shared accross all instances that use the same storage service. In this case one storage service URL can be used per home/network where you want to control the lights (so in most cases only one).
