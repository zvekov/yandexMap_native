ymaps.ready(function () {
	var map = new ymaps.Map(
			'map',
			{
				center: [60, 80],
				zoom: 4,
				type: 'yandex#map',
				controls: ['smallMapDefaultSet', 'rulerControl'],
			},
			{
				searchControlProvider: 'yandex#search',
			}
		),
		objectManager = new ymaps.ObjectManager()
	map.controls.get('zoomControl').options.set({ size: 'small' })

	// Загружаем GeoJSON файл, экспортированный из Конструктора карт.
	$.getJSON('//frail-time.surge.sh/data.geojson').done(function (geoJson) {
		geoJson.features.forEach(function (obj) {
			// Задаём контент балуна.
			obj.properties.balloonContent = obj.properties.description
			// Задаём пресет для меток с полем iconCaption.
			if (obj.properties.iconCaption) {
				obj.options = {
					// preset: 'islands#greenDotIconWithCaption',
				}
			}
		})
		// Добавляем описание объектов в формате JSON в менеджер объектов.
		objectManager.add(geoJson)
		// Добавляем объекты на карту.
		map.geoObjects.add(objectManager)
	})

	// Добавим заливку цветом (оставляет только РФ - остальные страны скрыты).
	// var pane = new ymaps.pane.StaticPane(map, {
	// 	zIndex: 100,
	// 	css: {
	// 		width: '100%',
	// 		height: '100%',
	// 		backgroundColor: '#f7f7f7',
	// 	},
	// })
	// map.panes.append('white', pane)

	// Зададим цвета федеральных округов.
	var districtColors = {
		cfo: '#ffff6f',
		szfo: '#54cbba',
		yfo: '#f9768e',
		skfo: '#9a5597',
		pfo: '#30cb05',
		urfo: '#bac1cc',
		sfo: '#16acdb',
		dfo: '#fbc520',
	}
	// Зададим подсказки при наведении на федеральный округ.
	var districtsHints = {
		cfo: 'ЦФО',
		szfo: 'СЗФО',
		yfo: 'ЮФО',
		skfo: 'СКФО',
		pfo: 'ПФО',
		urfo: 'УрФО',
		sfo: 'СФО',
		dfo: 'ДФО',
	}
	// Создадим балун.
	var districtBalloon = new ymaps.Balloon(map)
	districtBalloon.options.setParent(map.options)
	// Загрузим регионы.
	ymaps.borders
		.load('RU', {
			lang: 'ru',
			quality: 2,
		})
		.then(function (result) {
			// Создадим объект, в котором будут храниться коллекции с нашими регионами.
			var districtCollections = {}
			// Для каждого федерального округа создадим коллекцию.
			for (var district in districtColors) {
				districtCollections[district] = new ymaps.GeoObjectCollection(null, {
					fillColor: districtColors[district],
					strokeColor: districtColors[district],
					strokeOpacity: 0.3,
					fillOpacity: 0.3,
					hintCloseTimeout: 0,
					hintOpenTimeout: 0,
				})
				// Создадим свойство в коллекции, которое позже наполним названиями субъектов РФ.
				districtCollections[district].properties.districts = []
			}

			result.features.forEach(function (feature) {
				var iso = feature.properties.iso3166
				var name = feature.properties.name
				var district = districtByIso[iso]
				// Для каждого субъекта РФ зададим подсказку с названием федерального округа, которому он принадлежит.
				feature.properties.hintContent = districtsHints[district]
				// Добавим субъект РФ в соответствующую коллекцию.
				districtCollections[district].add(new ymaps.GeoObject(feature))
				// Добавим имя субъекта РФ в массив.
				districtCollections[district].properties.districts.push(name)
			})
			// Создадим переменную, в которую будем сохранять выделенный в данный момент федеральный округ.
			var highlightedDistrict
			for (var districtName in districtCollections) {
				// Добавим коллекцию на карту.
				map.geoObjects.add(districtCollections[districtName])
				// При наведении курсора мыши будем выделять федеральный округ.
				districtCollections[districtName].events.add('mouseenter', function (event) {
					var district = event.get('target').getParent()
					district.options.set({ fillOpacity: 1 })
				})
				// При выводе курсора за пределы объекта вернем опции по умолчанию.
				districtCollections[districtName].events.add('mouseleave', function (event) {
					var district = event.get('target').getParent()
					if (district !== highlightedDistrict) {
						district.options.set({ fillOpacity: 0.3 })
					}
				})
				// Подпишемся на событие клика.
				districtCollections[districtName].events.add('click', function (event) {
					var target = event.get('target')
					var district = target.getParent()
					// Если на карте выделен федеральный округ, то мы снимаем с него выделение.
					if (highlightedDistrict) {
						highlightedDistrict.options.set({ fillOpacity: 0.3 })
					}
					// Откроем балун в точке клика. В балуне будут перечислены регионы того федерального округа,
					// по которому кликнул пользователь.
					districtBalloon.open(event.get('coords'), district.properties.districts.join('<br>'))
					// Выделим федеральный округ.
					district.options.set({ fillOpacity: 1 })
					// Сохраним ссылку на выделенный федеральный округ.
					highlightedDistrict = district
				})
			}
		})
})
