function formDataToObj(formElement) {
	const formData = new FormData(formElement);
	const formDataObj = {};
	for (const key of formData.keys()) {
		formDataObj[key] = formData.getAll(key);
	}
	return formDataObj;
}

async function fetchSqlAndReplaceContainer({ reqType, body }) {
	const formElement = document.querySelector("#form-container");
	formElement.style.opacity = 0;
	document.body.style.backgroundImage = `linear-gradient(#504f4f, #070707)`;
	const response = await fetch("/result", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"request-type": reqType,
		},
		body: body,
	})
		.then((response) => {
			if (response.ok) {
				return response.json();
			}
			throw new Error("Not found");
		})
		.catch((e) => {
			window.alert("Nothing was found, please try again.");
			window.location.href = "/";
			console.error(e);
		});
	populateResultsToTemplate({
		resultsObj: response,
		templateId: "#results-template",
		containerSelector: formElement,
	});
	formElement.style.opacity = 1;

	return response;
}

function createSlider({
	slider,
	sliderValue,
	start,
	step,
	range,
	tooltips,
	connect,
	format,
	array,
}) {
	// create and intialize
	const sliderElement = slider;
	noUiSlider.create(sliderElement, {
		start: start,
		connect: connect,
		step: step,
		tooltips: tooltips,
		range: range,
		format: format,
	});
	const sliderValueElement = sliderValue;
	sliderValueElement.value = sliderElement.noUiSlider.get(true);

	// slider on update change input value
	sliderElement.noUiSlider.on("update", (value) => {
		if (array === true) {
			sliderValueElement.value = JSON.stringify(value);
		} else {
			sliderValueElement.value = value;
		}
	});
}

function populateFormWithSessionData({
	ratingSliderId,
	ratingSliderValueId,
	formContainerId,
	sessionStorageName,
}) {
	const formElement = document.getElementById(formContainerId);
	const sessionStorageItem = sessionStorage.getItem(sessionStorageName);

	if (sessionStorageItem !== null) {
		const formData = JSON.parse(sessionStorageItem);

		const formElements = formElement.elements;
		for (const [key, value] of Object.entries(formData)) {
			const formEle = formElements[key];
			if (
				Object.prototype.isPrototypeOf.call(NodeList.prototype, formEle)
			) {
				formEle.forEach((element) => {
					if (value.includes(element.value)) {
						element.checked = true;
					}
				});
			}
		}

		//
		const ratingSlider = document.getElementById(ratingSliderId);
		const ratingSliderInput = document.getElementById(
			ratingSlider.id + "-value"
		);
		const storageValue = JSON.parse(formData[ratingSliderInput.name]);
		if (storageValue) {
			ratingSlider.noUiSlider.set(storageValue);
		}
	}
}

async function checkUrlParams() {
	const urlParams = new URLSearchParams(document.location.search);
	const tconstParam = urlParams.get("tconst");
	if (tconstParam !== null) {
		await fetchSqlAndReplaceContainer({
			reqType: "retrieve",
			body: JSON.stringify({ tconst: tconstParam }),
		});
	}
}

function addSubmitListener({ formContainerId, sessionStorageName }) {
	const formElement = document.getElementById(formContainerId);
	formElement.addEventListener("submit", async (e) => {
		e.preventDefault();

		const sessionItem = sessionStorage.getItem(sessionStorageName);
		let formDataObj;
		let formDataObjStr;
		if (e.submitter.id === "form-submit") {
			formDataObj = formDataToObj(formElement);
			formDataObj["settings"] = {
				minvotes: localStorage.getItem("minvotes"),
				yearrange: JSON.parse(localStorage.getItem("yearrange")),
			};
			formDataObjStr = JSON.stringify(formDataObj);
			sessionStorage.setItem(sessionStorageName, formDataObjStr);
		} else if (e.submitter.id === "form-resubmit" && sessionItem !== null) {
			formDataObj = JSON.parse(sessionItem);
			formDataObj["seenIds"] = JSON.parse(
				sessionStorage.getItem("seenIds")
			);
			formDataObjStr = JSON.stringify(formDataObj);
			document.getElementById("page-container").style.background = "";
		} else {
			window.alert("Nothing was found, please try again.");
			window.location.href = "/";
		}

		const response = await fetchSqlAndReplaceContainer({
			reqType: "submit",
			body: formDataObjStr,
		});

		const state = { tconst: response["tconst"] };
		history.pushState(state, "", `/result?tconst=${response["tconst"]}`);

		const seenIds = sessionStorage.getItem("seenIds");
		if (e.submitter.id === "form-submit") {
			sessionStorage.setItem(
				"seenIds",
				JSON.stringify([response["tconst"]])
			);
		} else if (e.submitter.id === "form-resubmit" && seenIds !== null) {
			const seenIdsObj = JSON.parse(seenIds);
			seenIdsObj.push(response["tconst"]);
			sessionStorage.setItem("seenIds", JSON.stringify(seenIdsObj));
		}

		const tmdbResponse = await getTmdbApiData({
			tconst: response["tconst"],
		});
		if (tmdbResponse) {
			if (tmdbResponse["overview"]) {
				document.getElementById("title-overview").textContent =
					tmdbResponse["overview"];
			}
			if (tmdbResponse["poster_path"]) {
				document.body.style.backgroundImage = `url("https://image.tmdb.org/t/p/original${tmdbResponse["poster_path"]}"), linear-gradient(#504f4f, #070707)`;
			}
		}
	});
}

function listenToPopState() {
	window.addEventListener("popstate", async (e) => {
		if (e.state) {
			await fetchSqlAndReplaceContainer({
				reqType: "retrieve",
				body: JSON.stringify(e.state),
			});
		} else if (e.state === null) {
			location.reload();
		}
	});
}

function populateResultsToTemplate({
	templateId,
	resultsObj,
	containerSelector,
}) {
	const template = document.querySelector(templateId);
	const newTemplate = template.content.cloneNode(true);

	const title = newTemplate.querySelector("#primary-title");
	title.innerText = resultsObj["primaryTitle"];

	const titleInfo = newTemplate.querySelector("#title-info");
	titleInfo.innerText = `${resultsObj["averageRating"]}⭐ | ${resultsObj["startYear"]} | ${resultsObj["genres"]} | ${resultsObj["titleType_str"]}`;

	const imdbLink = newTemplate.querySelector("#imdb-link");
	imdbLink.href = `http://www.imdb.com/title/${resultsObj["tconst"]}`;

	containerSelector.replaceChildren(newTemplate);
}

async function getTmdbApiData({ tconst }) {
	const apiResponse = await fetch("/api/tconst", {
		method: "POST",
		body: tconst,
	})
		.then((response) => {
			if (response.ok) {
				return response.json();
			}
		})
		.catch((e) => {
			return false;
		});

	return apiResponse;
}

function addSettingsListener() {
	const settingsButton = document.getElementById("settings-button");
	settingsButton.addEventListener("click", (e) => {
		// clone settings template
		const settingsTemplate = document.getElementById("settings-template");
		const settingsFormClone = settingsTemplate.content.cloneNode(true);
		const formContainer = document.getElementById("form-container");
		formContainer.appendChild(settingsFormClone);

		// add minvotes slider
		createSlider({
			slider: document.getElementById("minvotes-slider"),
			sliderValue: document.getElementById("minvotes-slider-value"),
			tooltips: {
				to: (value) => Math.floor(value),
			},
			start: 5000,
			connect: "lower",
			step: 20,
			range: {
				min: 0,
				max: 100000,
			},
			format: {
				to: (value) => Math.floor(value),

				from: (value) => Number(value),
			},
		});

		// add year slider ranging from the year of first content available in DB to current year
		const currentYear = new Date().getFullYear();
		createSlider({
			slider: document.getElementById("year-slider"),
			sliderValue: document.getElementById("year-slider-value"),
			tooltips: {
				to: (value) => value,
			},
			start: [1965, currentYear],
			connect: true,
			step: 1,
			range: {
				min: [1894],
				max: [currentYear],
			},
			format: {
				to: (value) => Math.floor(value),

				from: (value) => Number(value),
			},
			array: true,
		});

		populateSettingsFromLocalStorage();

		// add overlay so elements behind settings are blocked from view
		const overlayElement = document.createElement("div");
		overlayElement.id = "settings-overlay";
		document.body.appendChild(overlayElement);

		// add settings save listener
		settingsSaveListener();
	});
}

function settingsSaveListener() {
	const settingsSaveButton = document.getElementById("save-settings");
	settingsSaveButton.addEventListener("click", (e) => {
		const settingsForm = document.getElementById("settings-form");

		const settingsData = new FormData(settingsForm);

		for (let [key, value] of settingsData.entries()) {
			localStorage.setItem(key, value);
		}

		const settingsOverlay = document.getElementById("settings-overlay");
		settingsForm.remove();
		settingsOverlay.remove();
	});
}

function populateSettingsFromLocalStorage() {
	const settingsSliders = [
		document.getElementById("minvotes-slider"),
		document.getElementById("year-slider"),
	];
	for (const slider of settingsSliders) {
		const sliderInput = document.getElementById(slider.id + "-value");
		const storageValue = JSON.parse(localStorage.getItem(sliderInput.name));
		if (storageValue) {
			slider.noUiSlider.set(storageValue);
		}
	}
}

export {
	formDataToObj,
	fetchSqlAndReplaceContainer,
	createSlider,
	checkUrlParams,
	populateFormWithSessionData,
	addSubmitListener,
	listenToPopState,
	getTmdbApiData,
	addSettingsListener,
};
