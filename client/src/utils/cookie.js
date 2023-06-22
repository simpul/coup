import Cookies from 'js-cookie';

export const getUsername = () => {
    return Cookies.get('username');
};

export const setUsername = (username) => {
    Cookies.set('username', username);
};
