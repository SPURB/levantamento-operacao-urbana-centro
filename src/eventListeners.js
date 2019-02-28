"use strict";
import { colocalizados, projetos, apiPost } from './model'
import { getProjectData } from './layers/projectsKmls'
import { 
	setInitialState,
	fitToId,
	switchVisibilityState,
	getFiles,
	createInfo,
	toggleInfoClasses,
	displayKmlInfo
} from './domRenderers'

/**
* Sidebar (top left) - Render initial base layer info and resets map to the initial state
*/
function sidebarGoHome (layers, baseLayer, list, view, fitPadding){
	let gohome = document.getElementById('gohome')
	gohome.addEventListener('click', () => {
		document.getElementById('info').classList.add('hidden')
		document.getElementById('gohome').classList.add('hidden')
		document.getElementById('baseInfo').classList.remove('hidden')

		// resetApp
		setInitialState('initial')
		fitToId(view, baseLayer, fitPadding)
		layers.forEach( lyr => switchVisibilityState(lyr, true) )
		list.forEach( liItem =>  document.getElementById('projeto-id_' + liItem ).checked = true )
	})
}

/**
 * Sidebar (left top) -> Hide all left menu
 */
function sideBarToggleChildren(){
	let hideshow = document.getElementById('toggleHidden')
	hideshow.addEventListener('click', () => {
		document.getElementById('info-kml').classList.add('no-display')
		document.getElementById('map').classList.toggle('no-panel')
		document.getElementById('infowrap').classList.toggle('hidden')
		hideshow.classList.toggle('rotate')
	})
}


/*
* Sidebar (left) -> Project picture info events - toggle source box
*/
function sideBarToggleFonte(){
	let openFonteBt = document.getElementById('openFonte')
	let closeFonteBt = document.getElementById('closeFonte')

	openFonteBt.addEventListener('click', function(event) {
		event.target.parentNode.classList.remove('closed')
		event.target.parentNode.classList.add('open')
	})

	closeFonteBt.addEventListener('click', function(event) {
		event.target.parentNode.classList.remove('open')
		event.target.parentNode.classList.add('closed')
	})	
}

/**
 * Observe if the map was deformed. Resets to the original proportion is changed
 * @param { Boolean } isPortrait The app window
 * @param { Object } map The Open Layers Map instance
 */
function mapObserver(isPortrait, map) {
	if (isPortrait) {
		let sidebar = document.getElementById('infowrap')
		var observer = new MutationObserver(function(mutationsList) {
			for(var mutation of mutationsList) {
				if (mutation.type == 'attributes') {
					setTimeout(function() { map.updateSize() }, 200)
				}
				else { return false }
			}
		})
		observer.observe(sidebar, { attributes: true, childList: false, subtree: false })
	}
}

/*
* Sidebar (right) -> Listeners for projetos checkboxes
*/
function layersController (listCreated, projectLayers, layerColors, view, fitPadding){
	listCreated.forEach(id => {
		id = Number(id)
		const prjId = 'projeto-id_' + id 
		const btnPojectId = 'btn-projeto-id_' + id
		const gotoBtn = document.getElementById(btnPojectId)
		const element = document.getElementById(prjId)
		const layer = projectLayers.find( layer => layer.values_.projectId === id)

		// fit to clicked project, change Sidebar (left) info, fit
		gotoBtn.onclick = () => {
			setInitialState('initial')
			const data = getProjectData(id, colocalizados)
			const colors = layerColors[id]
			const images = getFiles(id, projetos)

			// uncheck all itens except the clicked one at Sidebar (right) 
			const othersIds = listCreated.filter( idItem => idItem !== id )
			othersIds.forEach(idItem => {
				let checkEl = 'projeto-id_' + idItem
				document.getElementById(checkEl).checked = false
			})
			element.checked = true
			
			// hide all other layers
			projectLayers.forEach( tohidelayer => {
				switchVisibilityState(tohidelayer, false)
			})
			switchVisibilityState(layer, true)

			// hide panel Sidebar (right)
			document.getElementById('panel').classList.remove('open')
			document.getElementById('map').classList.remove('no-panel')

			// fit to clicked project, change Sidebar (left) info
			createInfo(data, colors, images)
			toggleInfoClasses()
			const projectLayer = projectLayers.find( layer => layer.values_.projectId === id)
			fitToId(view, projectLayer, fitPadding)
			displayKmlInfo(projectLayer.values_)
		}

		// toggle layer visibility with checkboxes status at Sidebar (right)
		element.onchange = () => {
			switchVisibilityState(layer, element.checked)
		}
	})
}

/**
* Listen to blur events at the commentbox form input and text fields 
* @param { String } idBase The base of id name
*/
function commentBoxBlurEvents(idBase) {
	document.forms[idBase].setAttribute('novalidate', true)
	document.forms[idBase].addEventListener('blur', event => {

		const validateFormExist = event.target.form

		// just proceed if this form have a 'validate' class
		if ( validateFormExist === undefined || !validateFormExist.classList.contains('validate')) return; 

		const fieldState = fieldErrors(event.target) // return isValid, message (if not valid)

		if (fieldState.isValid) {
			event.target.classList.remove('error')
			event.target.classList.add('touched')
		}

		else {
			event.target.classList.add('error')
		}

	}, true)
}


/**
* Add event listeners to toggle 'open' class to an element to hide 
* @param { Node } triggers The element from DOM to listen event click
* @param { Node } toHide The element to hide 
*/ 
function menuEvents (triggers, toHide){
	// const normalizedHTMLArr = Array.from(triggers)
	const normalizedHTMLArr = [...triggers]

	normalizedHTMLArr[0].addEventListener('click', event =>{
		toHide.classList.toggle('open')
		normalizedHTMLArr[1].classList.remove('hide')
	})
	normalizedHTMLArr[1].addEventListener('click', event =>{
		toHide.classList.toggle('open')
		normalizedHTMLArr[0].classList.remove('hide')
	})
}

/**
* Submit button click event 
* @param { String } idBase The base of id name of the form
* @param { Number } idConsulta The consulta id
* @param { Number } commentid The comment id
* @param { String } commentcontext The base of id name of the form
*/
function commentBoxSubmit(idBase, idConsulta, commentid, commentcontext) {
	let formErrors = []

	const submitBtnId = `${idBase}-submit` 
	const fieldClassName = `${idBase}-field`
	const fieldNameId = `${idBase}-name`
	const fieldSurnameId = `${idBase}-surname`
	const fieldOrganizationId = `${idBase}-organization`
	const fieldEmailId = `${idBase}-email`
	const fieldCommentId = `${idBase}-comment`

	document.getElementById(submitBtnId).addEventListener('click', e => {

		let inputs = [...document.forms[idBase].getElementsByClassName(fieldClassName)]
		inputs.forEach( input => {
			const fieldState = fieldErrors(input) // return isValid, message (if not valid)

			if (fieldState.isValid) {
				input.classList.remove('error')
			} 
			else {
				input.classList.add('error')

				// list errors
				formErrors.push({
					id: input.id,
					message: fieldState.message
				})
			}
		})

		if(formErrors.length > 0) {
			console.log('Errors:')
			console.log(formErrors)
			// make something with this errors

			formErrors = [] // reset state to next click check
		}

		else { // this form do not have errors

			let name = inputs.find( input => input.id === fieldNameId).value // João
			const surname = inputs.find( input => input.id === fieldSurnameId).value // da Silva
			const organization = inputs.find( input => input.id === fieldOrganizationId).value // Tabajara LTDA
			const email = inputs.find( input => input.id === fieldEmailId).value
			const content =  inputs.find( input => input.id === fieldCommentId).value

			name = `${name} ${surname}` // João da Silva
			if (organization || organization !=='') { name = `${name} (${organization})` } // João da Silva (Tabajara LTDA)

			const output = {
				'idConsulta': idConsulta,
				'name': name,
				'email': email,
				'content': content,
				'public': 0,
				'trash': 0,
				'postid': 0,
				'commentid': commentid,
				'commentcontext': commentcontext
			}
			apiPost('members', output)
		}
		e.preventDefault()
	})
}


/**
* Check form field input errors
* @param { Node } field The element input field to check for errors
* @returns { Object } if is Valid { isValid, id } . If is not valid { isValid, message, id }
* isValid -> Boolean. This field is valid or not.
* message -> String. The error message.
*/
function fieldErrors(field){
	const validity = field.validity
	let message = 'Campo inválido'

	// TODO: Change message for each error and field types
	// console.log(field.type) // field types 
	// text
	// textarea
	// email

	// console.log(field.validity) // possible errors
	// badInput: Boolean
	// customError: Boolean
	// patternMismatch: Boolean
	// rangeOverflow: Boolean
	// rangeUnderflow: Boolean
	// stepMismatch: Boolean
	// tooLong: Boolean
	// tooShort: Boolean
	// typeMismatch: Boolean
	// valid: Boolean
	// valueMissing: Boolean

	if(!validity.valid) {
		return {
			isValid: false, 
			message: message
		}
	}
	else {
		return { 
			isValid: true
		}
	}
}

export { 
	commentBoxBlurEvents, 
	commentBoxSubmit, 
	fieldErrors, 
	sidebarGoHome, 
	sideBarToggleChildren,
	sideBarToggleFonte,
	mapObserver,
	layersController,
	menuEvents
}