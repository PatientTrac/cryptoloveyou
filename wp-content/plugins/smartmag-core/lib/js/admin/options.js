/**
 * Methods that deal with meta box and other options.
 */
(function($) {			
	"use strict";

	function handleUpload() {
		
		var element      = $(this),
			text_box     = element.parent().find('.element-upload'),
			insert_label = element.data('insert-label'),
			mediaType    = element.data('media-type'),
			file_frame   = null;
		
		if (file_frame) {
			return file_frame.open();
		}
		
		file_frame = wp.media({
			title: element.data('title'),
			button: {text: insert_label},
			multiple: false
		});
		
		file_frame.on('select', function() {
			var attachment = file_frame.state().get('selection').first().toJSON();
			
			// Set it in hidden input.
			text_box.val(
				mediaType == 'id' ? attachment.id : attachment.url
			);
		
			// Remove existing img and add the new one.
			element.parent().find('.image-upload').find('img').remove();
			element.parent().find('.image-upload').prepend('<img src="' + attachment.url + '" />').fadeIn();
			element.parent().find('.after-upload').addClass('visible');
			
		});
		
		file_frame.open();
		
		return;
	}

	function removeUpload() {
		$(this).parent().parent().find('.element-upload').val('');
		$(this).parent().find('img').remove();
		$(this).parent().find('.after-upload').removeClass('visible');
		
		return false;
	}

	const init = () => {

		// Setup colors.
		if ($.fn.wpColorPicker) {
			$('.bunyad-color-picker').wpColorPicker();
		}

		// Setup upload handler.
		$(document).on('click', '.bunyad-meta .upload-btn, .bunyad-option .upload-btn', handleUpload);
		$(document).on('click', '.bunyad-meta .remove-image, .bunyad-option .remove-image', removeUpload);

	};

	init();

})(jQuery);