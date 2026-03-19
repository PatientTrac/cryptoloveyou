/**
 * Dismissable notices.
 */
jQuery(function($) {
	'use strict';

	function handleDismiss() {
		const parent = $(this).closest('.bunyad-admin-notice');
		const noticeId = parent.data('notice-id');
		const nonce    = parent.data('nonce');
		const isRemind = $(this).data('id') == 'remind' || $(this).hasClass('ts-notice-remind');

		if (!nonce || !noticeId) {
			return;
		}

		console.log({
			action: 'bunyad_admin_notice_dismiss',
			notice_id: noticeId,
			_wpnonce: nonce,
			remind: isRemind
		});

		$.post(Bunyad.ajaxurl || ajaxurl, {
			action: 'bunyad_admin_notice_dismiss',
			notice_id: noticeId,
			_wpnonce: nonce,
			remind: isRemind || 0
		});

		parent.hide();

		return false;
	}

	// AJAX request to the URL. Note: .notice-dismiss is for native cross icon link.
	$('.bunyad-admin-notice').on('click', '.notice-dismiss, .ts-notice-dismiss, [data-id=dismiss], [data-id=remind]', handleDismiss); 
	
	/**
	 * Theme update button confirmation.
	 */
	$('.ts-update-theme-btn').on('click', e => {
		const target = e.target;
		if (target.classList.contains('disabled')) {
			return e.preventDefault();
		}

		target.classList.add('disabled');
		
		if (!confirm(Bunyad_Admin_Notices.confirm_update)) {
			e.preventDefault();
		}
	})
});