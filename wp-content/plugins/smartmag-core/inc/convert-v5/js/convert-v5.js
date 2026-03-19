jQuery(function($) {

	const queue = ['builder', 'profiles', 'terms_meta', 'cleanup'];
	let nonce;
	let isProcessing = false;

	function init() {
		$('.smartmag-convert-begin').on('click', function() {	
			nonce = $(this).data('nonce');
			$(this).remove();

			beginConversion();

			return false;
		});

		window.addEventListener('beforeunload', function (e) {
			if (!isProcessing) {
				return;
			}
			e.preventDefault();

			// Chrome requires returnValue to be set
			e.returnValue = '';
		});
	}

	function beginConversion() {
		if (!nonce) {
			return;
		}
	
		convertNext();
	}

	function convertNext() {

		const item  = queue.shift();

		// All done if nothing left.
		if (!item) {
			$('.ts-migrations-done').show();

			isProcessing = false;
			return;
		}

		isProcessing = true;

		const progress = $(`.ts-migrations .convert-${ item.replace('_', '-') } .progress`);
		progress.removeClass('pending').addClass('processing').html('<span class="spinner is-active"></span> Processing');

		const failed = () => {
			progress.addClass('error').text('Failed');
			isProcessing = false;
		};

		$.post(
			SmartMag_Convert.ajaxUrl, 
			{
				nonce: nonce,
				action: 'smartmag_convert_v5_' + item
			}, 
			function(data) {
				if (data && data.success) {
					progress.addClass('success').text('Completed');
					convertNext();
					return;
				}

				failed();
			}
		)
		.fail(failed);
	}

	init();

});