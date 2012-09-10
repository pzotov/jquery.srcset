/*!
 *  A jQuery based image srcset polyfill with suport for bandwidth
 *
 * Copyright 2012 Peter Stulzer
 *
 * based on work by James South
 * Twitter: http://twitter.com/james_m_south
 * Github: https://github.com/JimBobSquarePants/srcset-polyfill
 * and
 * Nathan Ford
 * Github: https://github.com/nathanford/pngy
 *
 */
 
(function( $ ){
	"use strict";
  	var lazySetImageSrc,
  	settings,
    imageList = [],
  	// Regexes for matching queries.
    rSrc = /[^\s]+/,
    rHeight = /(\d+)h/,
    rWidth = /(\d+)w/,
    rRatio = /(\d+)x/,
    // Detect retina display
    // http: //www.quirksmode.org/blog/archives/2012/06/devicepixelrati.html
    pixelRatio = (window.devicePixelRatio || 1),
    // Get the window
    $window = $(window),
    debounce = function (func, wait, immediate) {
    	// http://lodash.com/docs/#debounce
    	var args,
    		result,
    		thisArg,
    		timeoutId;

        function delayed() {
           	timeoutId = null;
            if (!immediate) {
            	func.apply(thisArg, args);
        	}
        }

        return function () {
        	var isImmediate = immediate && !timeoutId;
        		args = arguments;
        		thisArg = this;
        	
        	clearTimeout(timeoutId);
        	timeoutId = setTimeout(delayed, wait);
        	
        	if (isImmediate) {
        		result = func.apply(thisArg, args);
            }
            return result;
        };
	},
  	methods = {
  		init : function( options ) {
  			settings = $.extend( {
  				loadspeed : false,
				loadsize : false,
				selector : 'bandwidth',
				display_results : false,
				apply_to_all_imgs: false,
				limits : {
					fast : 40,
					normal : 10,
					slow : 0
				},
				base: 'slow'
  			}, options);
  			
  			// Debounce run on resize.
  			lazySetImageSrc = debounce(methods.setImageSrc, 100);
  			$(window).resize(function () {
  				lazySetImageSrc();
  			});
  			
  			methods.loadspeed();
			
  			return this.each(function(){
  				var $this = $(this);
                // methods.setSrc.call($this);
                imageList.push($this);
  			});	
  		},
		setSrc : function () {
            // Set the data for recall.
            this.data("srcset", this.attr("srcset").split(","));
            var src = methods.getImageSrc(this);
            
            if (src) {
            	if ($(this).hasClass(settings.selector)) {
            		src = src.replace(settings.reg, '-' + settings.speed + ".$2");
				}
        		this.attr("src", src);
        	}
        },
		setImageSrc : function () {
            // Run from our cached list.
            $.each(imageList, function () {
                // This is jQuerified.
                methods.setSrc.call(this);
            });
        },
        getImageSrc : function ($image) {
            var i,
                imgWidth = 0,
                imgHeight = 0,
                imgSrc = null,
                imgSrcParts = $image.data("srcset"),
                len = imgSrcParts.length,
                width = $window.width(),
                height = $window.height();

            for (i = 0; i < len; i += 1) {
                // This is just a rough play on the algorithm.
                var newImgSrc = imgSrcParts[i].match(rSrc)[0],
                    newImgHeight = rHeight.test(imgSrcParts[i]) ? parseInt(imgSrcParts[i].match(rHeight)[1], 10) : 1,
                    newImgWidth = rWidth.test(imgSrcParts[i]) ? parseInt(imgSrcParts[i].match(rWidth)[1], 10) : 1,
                    newPixelRatio = rRatio.test(imgSrcParts[i]) ? parseInt(imgSrcParts[i].match(rRatio)[1], 10) : 1;
                    
                    // console.log('getImageSrc', newImgSrc, newImgHeight, newImgWidth, newPixelRatio);

                if ((newImgWidth > imgWidth && width > newImgWidth && newImgHeight > imgHeight && height > newImgHeight && newPixelRatio === pixelRatio)) {
                    imgWidth = newImgWidth;
                    imgSrc = newImgSrc;
                }
            }

            // Return null  
            return imgSrc;
        },
        loadspeed : function () {
			var p = settings, inittime, k;
			
			// add all IMGs to p.selector if apply_to_all_imgs is true
			if (p.apply_to_all_imgs) {
				p.selector += ', img';
			}
			
			// get all elements that match the selector
			p.imgs = $('.' +p.selector);
			
			if ( $(p.imgs).length ) {
			
				// only run the rest if there are elements that match p.selector
				var fristImg = (p.imgs[0].tagName == 'IMG') ? $(p.imgs[0]).attr('src') : $(p.imgs[0]).css('background-image').replace('url("','').replace('")','');
			
				$.ajax({
					url: fristImg + '?' + Math.random(),
					beforeSend: function () {
						// get time before ajax request
						var initdate = new Date();
						inittime = initdate.getTime();
					},
					success: function (d) {
						var loaddate = new Date(), limits = [], i = 0, j = 0;
						
						// get image size in Kb
						if (!p.loadsize) {
							p.loadsize = d.length / 1024;
						}
					
						// get loadspeed in seconds
						if (!p.loadspeed) {
							p.loadspeed = (loaddate.getTime() - inittime) / 1000; 
						}
					
						// get Kbs
						p.mbs = Math.floor((p.loadsize / p.loadspeed) * 100) / 100; 
				
						// reorder limits to highest to lowest
						for (k in p.limits) {
							limits.push([k, p.limits[k]]);
						}
						limits.sort(function(a, b) {return a[1] - b[1]});
						limits.reverse();
					
						// find the limit
						while (limits[i]) {
							p.speed = limits[i][0];
							if (limits[i][1] < p.mbs) {
								break;
							}
							i++;
						}
						p.base = limits[limits.length-1][0];
						p.reg = new RegExp("(\-" + p.base + "\.([A-Za-z]{3,4})\"*)$");
						
						// output speed if display_results has a selector
						$(p.display_results).html(p.mbs + ' Kbs / ' + p.speed);
						// uncomment to get a log of your load speed
						$('html').addClass('loadspeed-' + p.speed);
						
						methods.setImageSrc();
						
						// edit image paths
						while( p.imgs[j] ) {
							var t = p.imgs[j],
								reg = new RegExp("(\-" + p.base + "\.([A-Za-z]{3,4})\"*)$");
							
							if (t.tagName == 'IMG') {
								$(t).attr('src', $(t).attr('src').replace(p.reg, '-' + p.speed + ".$2"));
							} else {
								$(t).css('background-image', 'url(' + $(t).css('background-image')
									.replace('url("','').replace('")','')
									.replace(p.reg, '-' + p.speed + ".$2") + ')');
							}
							j++;
						}
					}
				});
			}
		}
	};
	
	$.fn.srcset = function( method ) {
		if ( methods[method] ) {
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.tooltip' );
		}
	};
})( jQuery );