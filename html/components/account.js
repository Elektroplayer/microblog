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

let usernameLabel = document.querySelector('#username');
let displaynameLabel = document.querySelector('#displayname');

let icon_pencil = usernameLabel.querySelector('.edit-button').innerHTML;
let icon_x = document.querySelector('#icon-x').innerHTML;

[usernameLabel, displaynameLabel].forEach((label) => {
    const field = label.dataset.field;

    let editButton = label.querySelector('.edit-button');
    let fieldValue = label.querySelector('.field-value');
    let fieldNull = label.querySelector('.field-null');
    let editInput = label.querySelector('.edit-input');
    let saveButton = label.querySelector('.save-button');

    editButton.addEventListener('click', () => {
        if (editButton.innerHTML != icon_x) {
            editButton.innerHTML = icon_x;

            fieldNull.hidden = false;
            editInput.hidden = false;
            editInput.value = fieldValue.textContent;
            editInput.focus();
            editInput.select();
            saveButton.hidden = false;
        } else {
            editButton.innerHTML = icon_pencil;

            fieldNull.hidden = true;
            editInput.hidden = true;
            saveButton.hidden = true;
        }
    });

    saveButton.addEventListener('click', async () => {
        const value = editInput.value.trim();

        editInput.disabled = true;
        saveButton.disabled = true;
        editButton.disabled = true;

        if (value === fieldValue.textContent.trim()) {
            editButton.click();
            return;
        }

        try {
            const response = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    [field]: value,
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Не удалось сохранить');
            }

            fieldValue.textContent = value;
            editButton.click();
        } catch (error) {
            alert(error.message);
        } finally {
            editInput.disabled = false;
            saveButton.disabled = false;
            editButton.disabled = false;

            editButton.click();
        }
    });
});
