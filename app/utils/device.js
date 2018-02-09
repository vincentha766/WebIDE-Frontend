function isAppleDeviceFunc () {
  // IE has no DOMNodeInserted so can not get this hack despite saying it is like iPhone
  // This will apply hack on all iDevices
  return navigator.userAgent.match(/(iPad|iPhone|iPod)/g) &&
    navigator.userAgent.match(/Safari/g) &&
    !navigator.userAgent.match(/Trident/g)
}

export const isAppleDevice = isAppleDeviceFunc()

const os = (navigator.platform.match(/mac|win|linux/i) || ['other'])[0].toLowerCase()
export const isMac = (os === 'mac')


// we can't tell what the actual visible window height is
// because we cannot account for the height of the mobile keyboard
// and any other mobile autocomplete UI that may appear
// so let's be conservative here rather than trying to max out every
// available pixel of height for the editor
export function calcHeight () {
  // estimate 270 px for keyboard
  let withoutKeyboard = window.innerHeight - 270
  const min = 270

  // iPhone shrinks header and removes footer controls ( back / forward nav )
  // at 39px we are at the largest viewport
  const portrait = window.innerHeight > window.innerWidth
  const smallViewport = ((portrait ? window.screen.height : window.screen.width) - window.innerHeight) > 40

  if (portrait) {
    // iPhone SE, it is super small so just
    // have a bit of crop
    if (window.screen.height === 568) {
      withoutKeyboard = 270
    }

    // iPhone 6/7/8
    if (window.screen.height === 667) {
      withoutKeyboard = smallViewport ? 295 : 325
    }

    // iPhone 6/7/8 plus
    if (window.screen.height === 736) {
      withoutKeyboard = smallViewport ? 353 : 383
    }

    // iPhone X
    if (window.screen.height === 812) {
      withoutKeyboard = smallViewport ? 340 : 370
    }

    // iPad can use innerHeight cause it renders nothing in the footer
    if (window.innerHeight > 920) {
      withoutKeyboard -= 45
    }
  } else {
    // landscape
    // iPad, we have a bigger keyboard
    if (window.innerHeight > 665) {
      withoutKeyboard -= 128
    }
  }


  // iPad portrait also has a bigger keyboard
  return Math.max(withoutKeyboard, min)
}
