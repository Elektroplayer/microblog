const formDoc = document.querySelector('#login-form');
const error = document.querySelector('#error');
const button = formDoc.querySelector('button[type="submit"]');

const password = formDoc.elements.password;
const login = formDoc.elements.username;

const params = new URLSearchParams(window.location.search);

if (params.get('registered') === '1') {
    const success = document.querySelector('#success');

    success.textContent =
        'Аккаунт успешно создан! Теперь войдите, используя свои данные.';
    success.hidden = false;

    history.replaceState(null, '', window.location.pathname);
}

if (params.get('login')) {
    login.value = params.get('login');

    history.replaceState(null, '', window.location.pathname);
}

async function request(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok)
        throw new Error(body?.error ?? 'Произошла неизвестная ошибка');

    return body;
}

formDoc.addEventListener('submit', async (event) => {
    event.preventDefault();

    button.disabled = true;
    error.hidden = true;

    const form = new FormData(formDoc);

    try {
        await request('/api/users/login', {
            username: form.get('username'),
            password: form.get('password'),
        });

        location.href = '/';
    } catch (err) {
        console.log(err);
        error.textContent = err.message ?? 'Произошла неизвестная ошибка';
        error.hidden = false;
    } finally {
        button.disabled = false;
    }
});
