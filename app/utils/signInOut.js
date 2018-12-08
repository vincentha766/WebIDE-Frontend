// http://pd.coding.com/api/account/logout

export function signout() {
    return fetch(__LOGOUT_URL__, {
        method: __LOGOUT_METHOD__,
        credentials: 'include',
    });
}

export function signInPage() {
    window.location = __LOGIN_URL__
}