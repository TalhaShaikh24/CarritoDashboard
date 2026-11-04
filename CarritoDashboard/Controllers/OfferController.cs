using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class OfferController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Offers & Promotions";
            ViewBag.PageSubtitle = "Manage promotional codes and discounts";
            return View();
        }
    }
}
