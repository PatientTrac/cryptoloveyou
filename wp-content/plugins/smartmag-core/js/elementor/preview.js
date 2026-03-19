(function($) {
	"use strict";

	$(window).on('elementor/frontend/init', () => {

		// elementorFrontend.hooks.addAction('frontend/element_ready/smartmag-featgrid.default', function (element) {

		elementorFrontend.hooks.addAction('frontend/element_ready/widget', element => {
			Bunyad.sliders();
		});
	});
})(jQuery);