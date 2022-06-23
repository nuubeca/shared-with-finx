<?php

namespace Sasb\ApiBundle\Controller;

use FOS\RestBundle\Controller\Annotations\Get;
use Sasb\ClientBundle\Entity\Client;
use Sasb\CoreBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\ParamConverter;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ClientController extends Controller implements TokenAuthenticatedController
{
    /**
     * @Get("clients/{social_security_number}")
     * @ParamConverter("client", class="SasbClientBundle:Client", options={"mapping" = {"social_security_number": "socialSecurityNumber"}})
     */
    public function getClientAction(Request $request, Client $client)
    {
        $serializer = $this->container->get('serializer');
        $data = $serializer->normalize($client, null, ['groups' => ['client']]);

        return new JsonResponse($data, Response::HTTP_OK);
    }
}
