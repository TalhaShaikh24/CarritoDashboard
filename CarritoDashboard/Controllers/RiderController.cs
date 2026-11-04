using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class RiderController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Riders";
            ViewBag.PageSubtitle = "Manage all registered riders";
            return View();
        }
    }
}
