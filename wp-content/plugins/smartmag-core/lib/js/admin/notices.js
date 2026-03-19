/**
 * Dismissable notices.
 */
jQuery(function($) {
	'use strict';

	// AJAX request to the URL
	$('.bunyad-admin-notice.is-dismissible').on('click', '.notice-dismiss', function() {

		const parent = $(this).parent('.notice');
		const noticeId = parent.data('notice-id');
		const nonce    = parent.data('nonce');

		if (!nonce || !noticeId) {
			return;
		}

		$.post(Bunyad.ajaxurl || ajaxurl, {
			'action': 'bunyad_dismiss_notice',
			'notice_id': noticeId,
			'_wpnonce': nonce
		});
	});
});