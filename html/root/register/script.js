const form = document.querySelector('#register-form');
const error = document.querySelector('#error');

const button = form.querySelector('button[type="submit"]');
const password = form.elements.password;
const passwordConfirm = form.elements.passwordConfirm;

function validatePasswords() {
    if (password.value !== passwordConfirm.value) {
        passwordConfirm.setCustomValidity('Пароли не совпадают');
    } else {
        passwordConfirm.setCustomValidity('');
    }
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

password.addEventListener('input', validatePasswords);
passwordConfirm.addEventListener('input', validatePasswords);

form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    error.hidden = true;
    button.disabled = true;
    validatePasswords();

    const formData = new FormData(form);
    let displayName = formData.get('displayName');

    try {
        await request('/api/users/reg', {
            username: formData.get('username'),
            ...(displayName ? { displayName } : {}),
            // displayName: formData.get('displayName') ?? undefined,
            password: formData.get('password'),
        });

        location.href = `/login?registered=1&login=${formData.get('username')}`;
    } catch (err) {
        console.log({ err });

        error.textContent = err.message ?? 'Произошла неизвестная ошибка';
        error.hidden = false;
    } finally {
        button.disabled = false;
    }
});
