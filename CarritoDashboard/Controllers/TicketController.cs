using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class TicketController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Support Tickets";
            ViewBag.PageSubtitle = "Manage customer support requests";
            return View();
        }
    }
}
