const API_URL = 'http://localhost:3000/films';

const collectionElement = document.querySelector('[data-ui="collection"]');
const statusElement = document.querySelector('[data-ui="status"]');
const statusTitleElement = statusElement.querySelector('.status__title');
const statusTextElement = statusElement.querySelector('.status__text');
const reloadButton = document.querySelector('[data-action="reload"]');

function setStatus(title, text) {
    statusTitleElement.textContent = title;
    statusTextElement.textContent = text;
}

async function fetchFilms() {
    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

async function loadFilms() {
    setStatus('Загрузка…', 'Получаем фильмы с сервера.');
    collectionElement.replaceChildren();
    reloadButton.disabled = true;

    try {
        const films = await fetchFilms();

        if (films.length === 0) {
            setStatus('Список пуст', 'Пока нет ни одного фильма. Добавьте первый через форму ниже.');
            return;
        }

        setStatus('Готово', `Фильмов в коллекции: ${films.length}`);
        renderFilms(films);
    } catch (error) {
        console.error('Не удалось загрузить фильмы:', error);
        setStatus(
            'Ошибка загрузки',
            'Не удалось получить фильмы. Проверьте, что API запущен, и нажмите «Обновить».'
        );
    } finally {
        reloadButton.disabled = false;
    }
}

function renderFilms(films) {
    collectionElement.replaceChildren();

    for (const film of films) {
        const card = document.createElement('article');
        card.className = 'film-card';

        const title = document.createElement('h3');
        title.className = 'film-card__title';
        title.textContent = film.title;

        const year = document.createElement('p');
        year.className = 'film-card__meta';
        year.textContent = `Год: ${film.year}`;

        const genre = document.createElement('p');
        genre.className = 'film-card__meta';
        genre.textContent = `Жанр: ${film.genre}`;

        const rating = document.createElement('p');
        rating.className = 'film-card__meta';
        rating.textContent = `Оценка: ${film.rating} / 10`;

        const status = document.createElement('p');
        status.className = 'film-card__status';
        status.textContent = film.isWatched ? 'Посмотрен' : 'Хочу посмотреть';

        card.append(title, year, genre, rating, status);
        collectionElement.append(card);
    }
}

reloadButton.addEventListener('click', loadFilms);

loadFilms();