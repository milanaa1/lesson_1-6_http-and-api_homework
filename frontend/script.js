const API_URL = 'http://localhost:3000/films';
const REQUEST_TIMEOUT_MS = 5000;

const FORM_TEXT = {
    createTitle: 'Добавить фильм',
    createButton: 'Отправить в API',
    editTitle: 'Редактировать фильм',
    editButton: 'Сохранить изменения',
};

const collectionElement = document.querySelector('[data-ui="collection"]');
const statusElement = document.querySelector('[data-ui="status"]');
const statusTitleElement = statusElement.querySelector('.status__title');
const statusTextElement = statusElement.querySelector('.status__text');
const reloadButton = document.querySelector('[data-action="reload"]');
const formElement = document.querySelector('[data-form="entry"]');
const formTitleElement = document.querySelector('#form-title');
const submitButton = formElement.querySelector('[data-action="submit"]');
const cancelEditButton = formElement.querySelector('[data-action="cancel-edit"]');

let films = [];
let editingFilmId = null;
let pendingDeleteCount = 0;

/* HTTP */

async function request(url, options = {}) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });

        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }

        return response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            const timeoutError = new Error(`Тайм-аут ${REQUEST_TIMEOUT_MS} мс`);
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timerId);
    }
}

function getErrorMessage(error) {
    if (error.name === 'TimeoutError') {
        return 'Сервер слишком долго не отвечает (тайм-аут).';
    }
    if (error.status === 404) {
        return 'Запись не найдена на сервере (404).';
    }
    if (error.status) {
        return `Сервер ответил ошибкой ${error.status}.`;
    }
    return 'Нет связи с API. Проверьте, что сервер запущен.';
}

function fetchFilms() {
    return request(API_URL);
}

function createFilm(film) {
    return request(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(film),
    });
}

function updateFilm(filmId, changes) {
    return request(`${API_URL}/${filmId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
    });
}

function removeFilm(filmId) {
    return request(`${API_URL}/${filmId}`, { method: 'DELETE' });
}

/* Состояния и отображение */

function setStatus(title, text) {
    statusTitleElement.textContent = title;
    statusTextElement.textContent = text;
}

function updateReloadButton(isLoading = false) {
    reloadButton.disabled = isLoading || pendingDeleteCount > 0;
}

function renderCollection(title, text) {
    collectionElement.replaceChildren();

    if (films.length === 0) {
        setStatus('Список пуст', 'Пока нет ни одного фильма. Добавьте первый через форму ниже.');
        return;
    }

    setStatus(title, text);

    for (const film of films) {
        collectionElement.append(createFilmCard(film));
    }
}

function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
}

function createActionButton(action, filmId, text, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button button--secondary film-card__button ${extraClass}`.trim();
    button.dataset.action = action;
    button.dataset.id = filmId;
    button.textContent = text;
    return button;
}

function createFilmCard(film) {
    const card = document.createElement('article');
    card.className = 'film-card';

    const actions = document.createElement('div');
    actions.className = 'film-card__actions';
    actions.append(
        createActionButton('edit', film.id, 'Изменить'),
        createActionButton('delete', film.id, 'Удалить', 'film-card__button--danger')
    );

    card.append(
        createTextElement('h3', 'film-card__title', film.title),
        createTextElement('p', 'film-card__meta', `Год: ${film.year}`),
        createTextElement('p', 'film-card__meta', `Жанр: ${film.genre}`),
        createTextElement('p', 'film-card__meta', `Оценка: ${film.rating} / 10`),
        createTextElement('p', 'film-card__status', film.isWatched ? 'Посмотрен' : 'Хочу посмотреть'),
        actions
    );

    return card;
}

/* Загрузка (GET) */

async function loadFilms() {
    setStatus('Загрузка…', 'Получаем фильмы с сервера.');
    collectionElement.replaceChildren();
    updateReloadButton(true);

    try {
        films = await fetchFilms();
        renderCollection('Готово', `Фильмов в коллекции: ${films.length}`);
    } catch (error) {
        console.error('Не удалось загрузить фильмы:', error);
        films = [];
        setStatus('Ошибка загрузки', `${getErrorMessage(error)} Нажмите «Обновить», чтобы повторить.`);
    } finally {
        updateReloadButton(false);
    }
}

/*  Форма: создание (POST) и редактирование (PATCH) */

function readFilmFromForm(form) {
    const formData = new FormData(form);

    return {
        title: formData.get('title').trim(),
        year: Number(formData.get('year')),
        genre: formData.get('genre'),
        rating: Number(formData.get('rating')),
        isWatched: formData.has('isWatched'),
    };
}

function getChangedFields(original, updated) {
    const changes = {};

    for (const key of Object.keys(updated)) {
        if (!original || original[key] !== updated[key]) {
            changes[key] = updated[key];
        }
    }

    return changes;
}

function startEditing(film) {
    editingFilmId = film.id;

    formElement.elements.namedItem('title').value = film.title;
    formElement.elements.namedItem('year').value = film.year;
    formElement.elements.namedItem('genre').value = film.genre;
    formElement.elements.namedItem('rating').value = film.rating;
    formElement.elements.namedItem('isWatched').checked = film.isWatched;

    formTitleElement.textContent = FORM_TEXT.editTitle;
    submitButton.textContent = FORM_TEXT.editButton;
    cancelEditButton.hidden = false;

    formElement.scrollIntoView({ behavior: 'smooth' });
    formElement.elements.namedItem('title').focus();
}

function stopEditing() {
    editingFilmId = null;
    formElement.reset();

    formTitleElement.textContent = FORM_TEXT.createTitle;
    submitButton.textContent = FORM_TEXT.createButton;
    cancelEditButton.hidden = true;
}

function setFormBusy(isBusy) {
    submitButton.disabled = isBusy;
    cancelEditButton.disabled = isBusy;
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const filmData = readFilmFromForm(formElement);
    setFormBusy(true);

    try {
        if (editingFilmId) {
            const original = films.find((film) => film.id === editingFilmId);
            const changes = getChangedFields(original, filmData);

            if (Object.keys(changes).length === 0) {
                stopEditing();
                setStatus('Без изменений', 'Вы ничего не поменяли, запрос не отправлялся.');
                return;
            }

            setStatus('Сохранение…', 'Отправляем изменения на сервер.');
            await updateFilm(editingFilmId, changes);
            stopEditing();
        } else {
            setStatus('Сохранение…', 'Отправляем фильм на сервер.');
            await createFilm(filmData);
            formElement.reset();
        }

        await loadFilms();
    } catch (error) {
        console.error('Не удалось сохранить фильм:', error);
        setStatus(
            'Ошибка сохранения',
            `${getErrorMessage(error)} Данные в форме сохранены — можно отправить ещё раз.`
        );
    } finally {
        setFormBusy(false);
    }
}

/* DELETE с оптимистичным обновлением */

async function deleteFilm(filmId) {
    const index = films.findIndex((film) => film.id === filmId);
    if (index === -1) return;

    const film = films[index];
    if (!confirm(`Удалить фильм «${film.title}»?`)) return;

    // 1. Сразу убираем карточку из интерфейса
    films = films.filter((item) => item.id !== filmId);
    if (editingFilmId === filmId) stopEditing();
    renderCollection('Удаление…', `«${film.title}» удаляется на сервере.`);

    pendingDeleteCount += 1;
    updateReloadButton();

    try {
        // 2. Параллельно отправляем настоящий запрос
        await removeFilm(filmId);
        renderCollection('Удалено', `«${film.title}» удалён. Фильмов в коллекции: ${films.length}`);
    } catch (error) {
        // 3. Ошибка — возвращаем фильм на прежнее место
        console.error('Не удалось удалить фильм:', error);
        films = [...films];
        films.splice(Math.min(index, films.length), 0, film);
        renderCollection('Ошибка удаления', `${getErrorMessage(error)} Фильм «${film.title}» возвращён в список.`);
    } finally {
        pendingDeleteCount -= 1;
        updateReloadButton();
    }
}

/* События */

function handleCollectionClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const filmId = button.dataset.id;

    if (button.dataset.action === 'delete') {
        deleteFilm(filmId);
    }

    if (button.dataset.action === 'edit') {
        const film = films.find((item) => item.id === filmId);
        if (film) startEditing(film);
    }
}

reloadButton.addEventListener('click', loadFilms);
formElement.addEventListener('submit', handleFormSubmit);
cancelEditButton.addEventListener('click', stopEditing);
collectionElement.addEventListener('click', handleCollectionClick);

loadFilms();