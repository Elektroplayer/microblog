let usernameLabel = document.querySelector('#username');
let displaynameLabel = document.querySelector('#displayname');
let passwordLabel = document.querySelector('#password');
let logoutButton = document.querySelector('#logout');

let icon_pencil = usernameLabel.querySelector('.edit-button').innerHTML;
let icon_x = document.querySelector('#icon-x').innerHTML;

[usernameLabel, displaynameLabel, passwordLabel].forEach((label) => {
    const field = label.dataset.field;

    let editButton = label.querySelector('.edit-button');
    let fieldValue = label.querySelector('.field-value');
    let fieldNull = label.querySelectorAll('.field-null');
    let editInput = label.querySelectorAll('.edit-input');
    let saveButton = label.querySelector('.save-button');

    editButton.addEventListener('click', () => {
        if (editButton.innerHTML != icon_x) {
            editButton.innerHTML = icon_x;

            fieldNull.forEach((f) => (f.hidden = false)); // .hidden = false
            editInput.forEach((f) => (f.hidden = false)); // .hidden = false;
            if (editInput.length == 1)
                editInput[0].value = fieldValue.textContent;
            editInput[0].focus();
            editInput[0].select();
            saveButton.hidden = false;
        } else {
            editButton.innerHTML = icon_pencil;

            fieldNull.forEach((f) => (f.hidden = true)); // .hidden = true;
            editInput.forEach((f) => {
                f.hidden = true;
                f.value = '';
            }); // .hidden = true;
            saveButton.hidden = true;
        }
    });

    saveButton.addEventListener('click', async () => {
        if ([...editInput].some((e) => !e.reportValidity())) return;

        editInput.forEach((f) => (f.disabled = true)); // .disabled = true;
        saveButton.disabled = true;
        editButton.disabled = true;

        let response;

        try {
            if (field == 'password') {
                const oldPassword = editInput[0].value;
                const newPassword = editInput[1].value;
                const conPassword = editInput[2].value;

                if (newPassword != conPassword) {
                    editInput.forEach((f) => (f.disabled = false)); // .disabled = false;

                    editInput[2].setCustomValidity('Пароли не совпадают');
                    editInput[2].reportValidity();
                    editInput[2].select();
                    editInput[2].focus();
                    return;
                }

                if (oldPassword == newPassword) {
                    editButton.disabled = false;
                    editButton.click();
                    return;
                }

                response = await fetch('/api/users/me/password', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        oldPassword,
                        newPassword,
                    }),
                });
            } else {
                const value = editInput[0].value.trim();

                if (value === fieldValue.textContent.trim()) {
                    editButton.disabled = false;
                    editButton.click();
                    return;
                }

                response = await fetch('/api/users/me', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        [field]: value,
                    }),
                });

                if (response.ok) fieldValue.textContent = value;
            }

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Не удалось сохранить');
            }

            editButton.disabled = false;
            editButton.click();
        } catch (error) {
            editInput.forEach((f) => (f.disabled = false)); // .disabled = false;

            editInput[0].setCustomValidity(error.message);
            editInput[0].reportValidity();
            console.log(error);
            // alert(error.message);
        } finally {
            editInput.forEach((f) => {
                f.disabled = false;
                f.value = '';
            }); // .disabled = false;
            saveButton.disabled = false;
            editButton.disabled = false;

            // editButton.click();
        }
    });

    editInput.forEach((ei) => {
        ei.addEventListener('input', () => {
            editInput.forEach((eii) => eii.setCustomValidity(''));
        });
    });
});

logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/users/logout', { method: 'POST' });

        if (!response.ok) throw new Error('Не удалось выйти из аккаунта');

        const username = usernameLabel
            .querySelector('.field-value')
            .textContent.trim();

        location.href = `/login?login=${encodeURIComponent(username)}`;
    } catch (error) {
        alert(error.message);
    }
});
