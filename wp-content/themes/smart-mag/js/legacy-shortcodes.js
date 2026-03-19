/**
 * Register shortcode related events
 */
jQuery(function($) {
	
	/**
	 * Shortcode: Tabs
	 */
	$('.sc-tabs a').click(function() {

		// tabs first
		var tabs = $(this).parents('ul');
		tabs.find('.active').removeClass('active');
		$(this).parent().addClass('active');
		
		// panes second
		var panes = tabs.siblings('.sc-tabs-panes');
		
		panes.find('.active').hide().removeClass('active');
		panes.find('#sc-pane-' + $(this).data('id')).addClass('active').fadeIn();
		
		return false;
	});
	
	/**
	 * Shortcode: Accordions & Toggles
	 */
	$('.sc-accordion-title > a').click(function() {
		
		var container = $(this).parents('.sc-accordions');
		container.find('.sc-accordion-title').removeClass('active');
		container.find('.sc-accordion-pane').slideUp().removeClass('active');
		
		var pane = $(this).parent().next();
		if (!pane.is(':visible')) {
			$(this).parent().addClass('active');
			pane.slideDown().addClass('active');
		}
		
		return false;
	});
	
	$('.sc-toggle-title > a').click(function() {
		$(this).parent().toggleClass('active');
		$(this).parent().next().slideToggle().toggleClass('active');
		
		return false;
	});
});