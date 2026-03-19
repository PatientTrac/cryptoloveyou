/**
 * Extending customizer module.
 */
(function($, api, _) {
	"use strict";
	
	const optionsKey    = Bunyad_CZ_Data.settingPrefix;
	const controlPrefix = Bunyad_CZ_Data.controlPrefix;
	
	/**
	 * Mailchimp parse
	 */
	$(document).on('input change', '#customize-control-bunyad_newsletter_submit_url input', function() {
		
		var code = $(this).val(),
		    match = code.match(/action=\"([^\"]+)\"/);
		
		if (match) {
			$(this).val(match[1]);
		}
	});

	/**
	 * Header presets.
	 */
	const doHeaderPreset = (control, preset) => {
		
		// Reset back to default value unless confirmed.
		const presetLabel = control.container.find(`[value="${preset}"] + label .label-text`).text();
		const message     = `Applying the preset will reset any customizations you have done for header. Confirm you wish to apply preset: ${presetLabel}.`;

		if (!confirm(message)) {
			// localCall = true;
			// setting.set(previous);

			return;
		}

		const presets = control.params.data;

		/**
		 * Reset all the header options before doing preset.
		 */
		const affected = [
			'header_*',
			'nav_*',
			'css_header_*',
			'css_drop_*',
			'css_nav_*',
			'css_nav_small_*',
			'css_hov_bg*'
		];

		const excludes = [
			'header_preset',
			'header_offcanvas_*',
			// 'header_mob_*',
			// 'css_header_mob_*',
			'header_text*',
			// 'css_header_text*',
			'header_button*'
		];
		
		Bunyad_CZ.presetsNotice.resetAffected(affected, excludes);

		/**
		 * Apply the presets values.
		 */
		const options = presets[preset];
		Object.entries(options).forEach(([key, value]) => {

			const setting = wp.customize(`${optionsKey}[${key}]`);
			if (!setting) {
				console.error('Missing Option: ', key, value);
				return;
			}

			setting.set(value);
		});
	};

	wp.customize.control(`${controlPrefix}header_preset`, control => {
		control.container.on('click', '[type=radio]', e => {
			e.stopPropagation();
			e.preventDefault();

			doHeaderPreset(control, $(e.target).val());
		});
	});

	api(optionsKey + '[header_preset]', (setting) => {
		let localCall = false;
		
		setting.bind((preset, previous) => {
			if (localCall) {
				localCall = false;
				return;
			}
		});
	});

	// Reset float share styles.
	api(optionsKey + '[share_float_style]', (setting) => {
		const affected = ['css_share_float*'];
		Bunyad_CZ.presetsNotice.setup(setting, affected, '_n_share_float');
	});

	// Reset float share styles.
	api(optionsKey + '[single_share_top_style]', (setting) => {
		const affected = ['css_single_share_top*'];
		Bunyad_CZ.presetsNotice.setup(setting, affected, '_n_single_share_top');
	});

	// Minor correction: Refresh CSS for correct value when toggling bet
	api(optionsKey + '[sidebar_width]', setting => {
		setting.bind(v => {
			api.previewer.send('bunyad-cz-render-css', []);
		});
	});

})(jQuery, wp.customize, _);