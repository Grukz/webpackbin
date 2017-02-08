import clicked from './signals/clicked'
import routed from './signals/routed'
import binRouted from './signals/binRouted'
import authenticate from './factories/authenticate'

export default {
  state: {
    isAuthenticating: true,
    snackbar: null,
    user: null
  },
  signals: {
    clicked,
    routed: authenticate(routed),
    binRouted: authenticate(binRouted)
  }
}
