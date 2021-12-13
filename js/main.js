// eslint-disable-next-line no-unused-vars
import HomeLighting from "./modules/elements/homelighting.js";

// TODO: Use scene API's appdata, picture and image properties
//  - appdata.order (number)
//  - appdata.background (css background)

// TODO: Configuration Dialog
//   TODO: Search for HUE Bridge
//   TODO: Storage provider selection

// TODO: Press button remotely
//  - "/api/<username>/config", "PUT", { linkbutton: true } // Only works on bride v1

// TODO: Activate Touchlink
//  - "/api/<username>/config", "PUT", { touchlink: true }

// TODO: Create User
//  - "/api", "POST", { devicetype: "home_lighting_app#XXX" } // ONly works when button pressed

// TODO: Delete User
//  - /api/<username>/config/whitelist/<other_username>, "DELETE"

// TODO: Remove Device (Delete button on unassigned lights in edit mode)