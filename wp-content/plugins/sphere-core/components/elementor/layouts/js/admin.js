"use strict";
(function($) {

	function openModal(e) {

		e.preventDefault();

		const modal = $('#spc-el-add-layout-modal');

		// Show modal.
		modal.dialog({
			title: modal.data('title'),
			autoOpen: false,
			draggable: false,
			classes: {'ui-dialog': 'wp-dialog spc-el-add-layout'},
			width: 'auto',
			modal: true,
			resizable: false,
			closeOnEscape: true,
			position: {
				my: "center",
				at: "center",
				of: window
			},
			open: function () {
				// Close dialog by clicking the overlay behind it
				$('.ui-widget-overlay').bind('click', function() {
					modal.dialog('close');
				})
			},
			create: function () {
				$('.ui-dialog-titlebar-close').addClass('ui-button');
			},
		});

		modal.dialog('open');
	}

	function init() {
		$(document).on('click', '.page-title-action', openModal);
	}

	init();

})(jQuery);