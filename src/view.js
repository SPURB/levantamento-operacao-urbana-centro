"use strict"
import 'ol/ol.css';
import 'ol-layerswitcher/src/ol-layerswitcher.css';
import docReady from 'document-ready'
import Map from 'ol/Map'
import View from 'ol/View'

import LayerSwitcher from 'ol-layerswitcher';
import {defaults as defaultControls, ScaleLine} from 'ol/control';

import { projetos, colocalizados  } from './model'
import { returnLayers, layerColors, getProjectData } from './layers/projectsKmls'
import { returnBases } from './layers/bases'
import {
	baseObject,
	noBaseProjetos,
	renderElement,
	// createList,
	setListActions,
	fitToId,
	smallerExtent,
	menuEvents,
	getFiles,
	createInfo,
	createBaseInfo,
} from './domRenderers'

docReady(() => {
	const justBase = baseObject(projetos) // single'BASE' projetos Object
	const baseLayers = returnBases(justBase, process.env.APP_URL, false) // open layer's BASE's layers

	const noBase = noBaseProjetos(projetos) // projetos 
	const projectLayers = returnLayers(noBase, process.env.APP_URL, colocalizados) // open layer's projects layers

	let view = new View({
		center: [ -5190695.271418285, -2696956.332871481 ],
		projection: 'EPSG:3857',
		zoom: 13,
		minZoom: 12.7,
		maxZoom: 28
	})



	let map = new Map({
		layers: baseLayers, 
		loadTilesWhileAnimating: true,
		target: 'map',
		view: view,
		controls: defaultControls().extend([
			 new ScaleLine()
		])
	})

	/*
	* map events
	*/
	map.on('singleclick', evt => {
		let idAndextents = []
		map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
			const projectjId = layer.values_.projectId
			if(projectjId !== 0) { // exclui a base
				idAndextents.push(
				{
					id: projectjId,
					extent: layer.getSource().getExtent()
				})
			}
		})
		if(idAndextents.length >= 1) {
			const smaller = smallerExtent(idAndextents)
			view.fit(smaller.extent, { // fit to smaller extent 
				duration: 1000
			})

			const info = document.getElementById("info")
			info.classList.remove("hidden")

			if(getProjectData(smaller.id, colocalizados)){
				const data = getProjectData(smaller.id, colocalizados) // get data from colocalizados.json
				const images = getFiles(smaller.id, projetos)

				createInfo(data, layerColors[smaller.id], images)
				document.getElementById('baseInfo').classList.add('hidden') // classes' changes for clicks on map
				document.getElementById('gohome').classList.remove('hidden')
				if (window.innerHeight > window.innerWidth) {
					document.getElementById('infowrap').classList.remove('hidden')
					document.getElementById('toggleHidden').classList.add('rotate')
				}
				else {
					document.getElementById('infowrap').classList.add('hidden')
					document.getElementById('toggleHidden').classList.remove('rotate')
				}
			}
			else { renderElement("<div class='erro'>Algo deu errado... <p class='info'>Projeto ID <span>" + smaller.id + "</span></p></div>", "#info") }
		}
	})

	/*
	* sidebar events
	*/
	createBaseInfo(getProjectData('BASE', colocalizados)) // sidebar first load

	let fitToBaseLayer = new Promise( () => {
		setTimeout(() => {
			fitToId(view, baseLayers, 0) // fit to base layer
		}, 1500 )
	})

	let addProjectLayers = new Promise( () => {
		setTimeout(() => {
			projectLayers.forEach(layer => map.addLayer(layer)) // add project layers
		}, 0)
	})

	let setListeners = new Promise( () => {
		setTimeout(() => {
			 // create event liteners
			let gohomeName = document.getElementById('gohomeName')
			gohomeName.innerText = getProjectData('BASE', colocalizados).NOME
			let gohome = document.getElementById('gohome')
			gohome.addEventListener('click', function() {
				document.getElementById('info').classList.add('hidden')
				document.getElementById('gohome').classList.add('hidden')
				document.getElementById('baseInfo').classList.remove('hidden')
				fitToId(view, baseLayers, 0)
			})

			/*
			* sidebar hiding - classes' changes
			*/
			var hideshow = document.getElementById('toggleHidden')
			hideshow.addEventListener('click', function(event) {
				console.log(event)
				document.getElementById('infowrap').classList.toggle('hidden')
				hideshow.classList.toggle('rotate')
			})

			/*
			* sidebar projects picture info events - toggle source box
			*/
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
			/*
			* for landscape devices, resize map for sidebar hiding/showing
			*/
			if (window.innerHeight < window.innerWidth) {
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
		}, 0)
	})

	
	/*
	* Ordered app initiation 
	*/
	Promise.all([
		/*
		 * First create DOM elements
		*/
		// createList(colocalizados), // TODO: injetar lista adicionado com layerSwitcher
		setListActions(document.getElementById("projetos"), view, projectLayers),
		menuEvents(document.getElementsByClassName('menu-display'), document.getElementById("panel")),
	])
	/*
	* Then add event listeners and do map events 
	*/
	.then( () => setListeners)
	.then( () => fitToBaseLayer )
	.then( () => addProjectLayers )
	.catch( error => console.error(error) )

	let layerSwitcher = new LayerSwitcher()
	map.addControl(layerSwitcher)

	// let projetosDom = document.getElementById('legenda-projetos')
	// let layerSwitcher = new LayerSwitcher().renderPanel(map, projetosDom)
	// map.addControl(layerSwitcher)

})