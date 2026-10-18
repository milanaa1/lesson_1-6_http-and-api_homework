const API_URL = 'http://localhost:3000/films';

const collectionElement = document.querySelector('[data-ui="collection"]');

async function loadFilms() {
    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const films = await response.json();
    renderFilms(films);
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

loadFilms();