def start_trip(page,kind):
 page.evaluate('window.__freeze=true')
 page.locator('#title-screen #species').wait_for(state='visible',timeout=240000)
 page.locator('[data-mode="'+kind+'"]').click()
 page.locator('#start').click(timeout=240000)
 page.wait_for_function('!!window.__portalQA&&__portalQA.phase==="world"||!!document.querySelector("#startup-error")?.textContent',timeout=240000,polling=100)
 assert not page.locator('#startup-error').text_content()
