'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(distance, duration, coords) {
        // console.log(this.date);
        this.distance = distance; // in km
        this.duration = duration; // in min
        this.coords = coords; // [lat, lng]
    }

    _setDescription() {
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
            months[this.date.getMonth()]
        } ${this.date.getDate()}`;

        return this.description;
    }

    click() {
        this.clicks++;
        return this.clicks;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(distance, duration, coords, cadence) {
        super(distance, duration, coords);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // Pace = Time / Distance;
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling'; // will be available in any instance

    constructor(distance, duration, coords, elevationGain) {
        super(distance, duration, coords);
        this.elevationGain = elevationGain;
        this._calcSpeed();
        this._setDescription();
    }

    _calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

class App {
    #workouts = [];
    #map;
    #mapZoomLevel = 12;
    #mapEvent;

    constructor() {
        // GET user's current position
        this._getPosition();

        // GET data from local storage
        this._getLocalStorage();

        // ATTACH event handlers
        // handle submit event from form input field
        // Add event listener to submit the form
        form.addEventListener('submit', this._newWorkout.bind(this)); // "this" keyword inside of event handlers is equals to element, which the event handler is attached

        // handle type change event
        inputType.addEventListener('change', this._toggleElevationField);

        // move to popup when we click the exact workout in the list
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    // load page
    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this),
                function (error) {
                    console.error(
                        'Could not access to your location with error code : ' +
                            error.code +
                            ' and message : ' +
                            error.message
                    );
                },
                {
                    enableHighAccuracy: true,
                }
            );
        }
    }

    // event #1: get position
    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        // const link = `https://www.google.com/maps/@${latitude},${longitude}`;
        const coords = [latitude, longitude];
        // console.log(link);
        this.#map = L.map('map', {
            center: coords,
            zoom: this.#mapZoomLevel,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);

        // handling clicks in map
        this.#map.on('click', this._showForm.bind(this));

        // render markers
        this.#workouts.forEach(work => {
            // this._renderWorkout(work);
            this._renderWorkoutMarker(work);
        });
    }

    // event #2: Click on Map
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // empty input fields
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);
    }

    // event #3: Change input => cycling || running
    _toggleElevationField() {
        inputElevation.closest('div').classList.toggle('form__row--hidden');
        inputCadence.closest('div').classList.toggle('form__row--hidden');
    }

    // event #4: Submit form
    _newWorkout(e) {
        const validateInputs = function (...inputs) {
            return inputs.every(inp => Number.isFinite(inp));
        };

        const allPositive = function (...inputs) {
            return inputs.every(inp => inp > 0);
        };

        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value; // "+" converts string to number
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        const coords = [lat, lng];
        let workout;

        // if workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (
                !validateInputs(duration, distance, cadence) ||
                !allPositive(duration, distance, cadence)
            )
                return alert('Inputs have to be a positive numbers');

            workout = new Running(distance, duration, coords, cadence);
        }

        // If workout cycling, create cycling object
        if (type === 'cycling') {
            const elevationGain = +inputElevation.value;
            // Check if data is valid
            if (
                !validateInputs(duration, distance, elevationGain) ||
                !allPositive(duration, distance)
            )
                return alert('Inputs have to be a positive numbers');

            workout = new Cycling(distance, duration, coords, elevationGain);
        }

        // Add new Object on workout array
        this.#workouts.push(workout);

        // Render workouts on the map
        this._renderWorkoutMarker(workout);
        // console.log(workout);

        // Render workouts in the list
        this._renderWorkout(workout);

        // Hide form + Clear input fields
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        // console.log(coords);
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if (workout.type === 'running') {
            html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
        </div>
        </li>`;
        }

        if (workout.type === 'cycling') {
            html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
        </div>
        </li> -->`;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        // console.log(workoutEl);
        const id = workoutEl.dataset.id;

        const index = this.#workouts.findIndex(work => work.id === id);
        // console.log(index);
        const coordinates = this.#workouts[index].coords;
        // console.log(coordinates);
        this.#map.setView(coordinates, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        });

        console.log(this.#workouts[index].click());
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        // console.log(datas, typeof datas);

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
            // this._renderWorkoutMarker(work);
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();

// const workout = new Workout(23, 34, 54);
